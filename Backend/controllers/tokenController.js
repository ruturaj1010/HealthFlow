const crypto = require("crypto");
const { withTransaction } = require("../DB/db");

const buildTokenCode = (doctorId, tokenNumber) => {
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const doctorCode = String(doctorId).replace(/-/g, "").slice(0, 8).toUpperCase();
    const randomCode = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `${dateCode}-${doctorCode}-${String(tokenNumber).padStart(3, "0")}-${randomCode}`;
};

const createToken = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const role = req.user?.role;
        const userId = req.user?.userId;
        const { appointment_id, doctor_id } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!appointment_id || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: "appointment_id and doctor_id are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const data = await withTransaction(async (client) => {
            let resolvedDoctorId = doctor_id;
            if (role === "DOCTOR") {
                const ownDoctor = await client.query(
                    "SELECT id FROM doctors WHERE user_id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
                    [userId, tenantId]
                );
                if (ownDoctor.rowCount === 0) {
                    throw new Error("Doctor profile not found for tenant");
                }
                resolvedDoctorId = ownDoctor.rows[0].id;
            }

            const appointmentCheck = await client.query(
                `SELECT id
                 FROM appointments
                 WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3 AND is_deleted = FALSE
                 LIMIT 1`,
                [appointment_id, resolvedDoctorId, tenantId]
            );
            if (appointmentCheck.rowCount === 0) {
                throw new Error("Appointment not found for tenant and doctor");
            }

            const existingToken = await client.query(
                `SELECT id, appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id, created_at
                 FROM queue_tokens
                 WHERE appointment_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
                 LIMIT 1`,
                [appointment_id, tenantId]
            );
            if (existingToken.rowCount > 0) {
                return { exists: true, token: existingToken.rows[0] };
            }

            const lockResult = await client.query(
                `SELECT last_token
                 FROM doctor_daily_counter
                 WHERE doctor_id = $1 AND date = CURRENT_DATE AND tenant_id = $2 AND is_deleted = FALSE
                 FOR UPDATE`,
                [resolvedDoctorId, tenantId]
            );

            let tokenNumber;
            if (lockResult.rowCount === 0) {
                try {
                    const insertCounter = await client.query(
                        `INSERT INTO doctor_daily_counter (doctor_id, date, last_token, tenant_id, created_by)
                         VALUES ($1, CURRENT_DATE, 1, $2, $3)
                         RETURNING last_token`,
                        [resolvedDoctorId, tenantId, userId]
                    );
                    tokenNumber = insertCounter.rows[0].last_token;
                } catch (error) {
                    if (error.code !== "23505") {
                        throw error;
                    }
                    const relock = await client.query(
                        `SELECT last_token
                         FROM doctor_daily_counter
                         WHERE doctor_id = $1 AND date = CURRENT_DATE AND tenant_id = $2 AND is_deleted = FALSE
                         FOR UPDATE`,
                        [resolvedDoctorId, tenantId]
                    );
                    const updated = await client.query(
                        `UPDATE doctor_daily_counter
                         SET last_token = $1
                         WHERE doctor_id = $2 AND date = CURRENT_DATE AND tenant_id = $3 AND is_deleted = FALSE
                         RETURNING last_token`,
                        [relock.rows[0].last_token + 1, resolvedDoctorId, tenantId]
                    );
                    tokenNumber = updated.rows[0].last_token;
                }
            } else {
                const nextToken = lockResult.rows[0].last_token + 1;
                const updated = await client.query(
                    `UPDATE doctor_daily_counter
                     SET last_token = $1
                     WHERE doctor_id = $2 AND date = CURRENT_DATE AND tenant_id = $3 AND is_deleted = FALSE
                     RETURNING last_token`,
                    [nextToken, resolvedDoctorId, tenantId]
                );
                tokenNumber = updated.rows[0].last_token;
            }

            const tokenCode = buildTokenCode(resolvedDoctorId, tokenNumber);
            const tokenInsert = await client.query(
                `INSERT INTO queue_tokens (appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id, created_by)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
                 RETURNING id, appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id, created_at`,
                [appointment_id, resolvedDoctorId, tokenNumber, tokenCode, tenantId, userId]
            );

            return { exists: false, token: tokenInsert.rows[0] };
        });

        if (data.exists) {
            return res.status(409).json({
                success: false,
                message: "Token already exists for this appointment",
                data: data.token,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Token generated successfully",
            data: data.token,
        });
    } catch (error) {
        if (error.message === "Appointment not found for tenant and doctor") {
            return res.status(404).json({ success: false, message: error.message });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to generate token",
            error: error.message,
        });
    }
};

const updateTokenStatus = (nextStatus, successMessage) => async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await withTransaction(async (client) => {
            const lockToken = await client.query(
                `SELECT id, status
                 FROM queue_tokens
                 WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
                 FOR UPDATE`,
                [id, tenantId]
            );

            if (lockToken.rowCount === 0) {
                throw Object.assign(new Error("Token not found"), { status: 404 });
            }

            const currentStatus = lockToken.rows[0].status;
            const allowedTransitions = {
                waiting: ["in_progress", "skipped"],
                in_progress: ["waiting", "done"],
            };
            if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(nextStatus)) {
                throw Object.assign(new Error(`Invalid token transition: ${currentStatus} -> ${nextStatus}`), {
                    status: 400,
                });
            }

            return client.query(
                `UPDATE queue_tokens
                 SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND tenant_id = $3
                   AND is_deleted = FALSE
                 RETURNING id, appointment_id, doctor_id, token_number, token_code, queue_date, status, tenant_id, created_at`,
                [nextStatus, id, tenantId]
            );
        });

        return res.status(200).json({
            success: true,
            message: successMessage,
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : "Failed to update token status",
            error: error.message,
        });
    }
};

const callNextToken = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await withTransaction(async (client) => {
            const nextToken = await client.query(
                `SELECT id
                 FROM queue_tokens
                 WHERE tenant_id = $1
                   AND queue_date = CURRENT_DATE
                   AND status = 'waiting'
                   AND is_deleted = FALSE
                 ORDER BY created_at ASC
                 LIMIT 1
                 FOR UPDATE SKIP LOCKED`,
                [tenantId]
            );

            if (nextToken.rowCount === 0) {
                throw Object.assign(new Error("No waiting token found"), { status: 404 });
            }

            return client.query(
                `UPDATE queue_tokens
                 SET status = 'in_progress'
                 WHERE id = $1 AND tenant_id = $2
                 RETURNING id, appointment_id, doctor_id, token_number, token_code, queue_date, status, tenant_id, created_at`,
                [nextToken.rows[0].id, tenantId]
            );
        });

        return res.status(200).json({
            success: true,
            message: "Next token called successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : "Failed to call next token",
            error: error.message,
        });
    }
};

module.exports = {
    createToken,
    skipToken: updateTokenStatus("skipped", "Token skipped successfully"),
    holdToken: updateTokenStatus("waiting", "Token put on hold successfully"),
    callNextToken,
};
