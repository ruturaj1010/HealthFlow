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
            const appointmentCheck = await client.query(
                `SELECT id
                 FROM appointments
                 WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3
                 LIMIT 1`,
                [appointment_id, doctor_id, tenantId]
            );
            if (appointmentCheck.rowCount === 0) {
                throw new Error("Appointment not found for tenant and doctor");
            }

            const existingToken = await client.query(
                `SELECT id, appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id, created_at
                 FROM queue_tokens
                 WHERE appointment_id = $1 AND tenant_id = $2
                 LIMIT 1`,
                [appointment_id, tenantId]
            );
            if (existingToken.rowCount > 0) {
                return { exists: true, token: existingToken.rows[0] };
            }

            const lockResult = await client.query(
                `SELECT last_token
                 FROM doctor_daily_counter
                 WHERE doctor_id = $1 AND date = CURRENT_DATE AND tenant_id = $2
                 FOR UPDATE`,
                [doctor_id, tenantId]
            );

            let tokenNumber;
            if (lockResult.rowCount === 0) {
                try {
                    const insertCounter = await client.query(
                        `INSERT INTO doctor_daily_counter (doctor_id, date, last_token, tenant_id)
                         VALUES ($1, CURRENT_DATE, 1, $2)
                         RETURNING last_token`,
                        [doctor_id, tenantId]
                    );
                    tokenNumber = insertCounter.rows[0].last_token;
                } catch (error) {
                    if (error.code !== "23505") {
                        throw error;
                    }
                    const relock = await client.query(
                        `SELECT last_token
                         FROM doctor_daily_counter
                         WHERE doctor_id = $1 AND date = CURRENT_DATE AND tenant_id = $2
                         FOR UPDATE`,
                        [doctor_id, tenantId]
                    );
                    const updated = await client.query(
                        `UPDATE doctor_daily_counter
                         SET last_token = $1
                         WHERE doctor_id = $2 AND date = CURRENT_DATE AND tenant_id = $3
                         RETURNING last_token`,
                        [relock.rows[0].last_token + 1, doctor_id, tenantId]
                    );
                    tokenNumber = updated.rows[0].last_token;
                }
            } else {
                const nextToken = lockResult.rows[0].last_token + 1;
                const updated = await client.query(
                    `UPDATE doctor_daily_counter
                     SET last_token = $1
                     WHERE doctor_id = $2 AND date = CURRENT_DATE AND tenant_id = $3
                     RETURNING last_token`,
                    [nextToken, doctor_id, tenantId]
                );
                tokenNumber = updated.rows[0].last_token;
            }

            const tokenCode = buildTokenCode(doctor_id, tokenNumber);
            const tokenInsert = await client.query(
                `INSERT INTO queue_tokens (appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                 RETURNING id, appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id, created_at`,
                [appointment_id, doctor_id, tokenNumber, tokenCode, tenantId]
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

module.exports = {
    createToken,
};
