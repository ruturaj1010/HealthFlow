const crypto = require("crypto");
const { withTransaction } = require("../DB/db");

const buildTokenCode = (doctorId, tokenNumber) => {
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const doctorCode = String(doctorId).replace(/-/g, "").slice(0, 8).toUpperCase();
    const randomCode = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `${dateCode}-${doctorCode}-${String(tokenNumber).padStart(3, "0")}-${randomCode}`;
};

const bookFromReception = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { patient_id, patient_name, patient_phone, doctor_id, slot_id } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!doctor_id || !slot_id) {
            return res.status(400).json({
                success: false,
                message: "doctor_id and slot_id are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const data = await withTransaction(async (client) => {
            let resolvedPatientId = patient_id || null;
            let createdPatient = null;

            if (resolvedPatientId) {
                const patientCheck = await client.query(
                    "SELECT id FROM patients WHERE id = $1 AND tenant_id = $2 LIMIT 1",
                    [resolvedPatientId, tenantId]
                );
                if (patientCheck.rowCount === 0) {
                    throw new Error("Patient not found");
                }
            } else {
                if (!patient_name || !patient_phone) {
                    throw new Error("Provide patient_id or patient_name and patient_phone");
                }

                const existingPatient = await client.query(
                    `SELECT id, user_id, name, phone, tenant_id, created_at
                     FROM patients
                     WHERE phone = $1 AND tenant_id = $2
                     LIMIT 1`,
                    [patient_phone, tenantId]
                );

                if (existingPatient.rowCount > 0) {
                    resolvedPatientId = existingPatient.rows[0].id;
                } else {
                    const patientInsert = await client.query(
                        `INSERT INTO patients (name, phone, tenant_id)
                         VALUES ($1, $2, $3)
                         RETURNING id, user_id, name, phone, tenant_id, created_at`,
                        [patient_name, patient_phone, tenantId]
                    );
                    createdPatient = patientInsert.rows[0];
                    resolvedPatientId = createdPatient.id;
                }
            }

            const slotCheck = await client.query(
                `SELECT id, slot_date, max_patients
                 FROM time_slots
                 WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3
                 LIMIT 1`,
                [slot_id, doctor_id, tenantId]
            );
            if (slotCheck.rowCount === 0) {
                throw new Error("Slot not found for this doctor and tenant");
            }

            const slot = slotCheck.rows[0];
            const capacityCheck = await client.query(
                "SELECT COUNT(*)::int AS total FROM appointments WHERE slot_id = $1 AND tenant_id = $2",
                [slot_id, tenantId]
            );
            const currentCount = capacityCheck.rows[0].total;
            if (currentCount >= slot.max_patients) {
                throw new Error("Reached max capacity. Please book for tomorrow's slot");
            }

            const appointmentInsert = await client.query(
                `INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, tenant_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, patient_id, doctor_id, slot_id, appointment_date, tenant_id, created_at`,
                [resolvedPatientId, doctor_id, slot_id, slot.slot_date, tenantId]
            );
            const appointment = appointmentInsert.rows[0];

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
                const updated = await client.query(
                    `UPDATE doctor_daily_counter
                     SET last_token = $1
                     WHERE doctor_id = $2 AND date = CURRENT_DATE AND tenant_id = $3
                     RETURNING last_token`,
                    [lockResult.rows[0].last_token + 1, doctor_id, tenantId]
                );
                tokenNumber = updated.rows[0].last_token;
            }

            const tokenCode = buildTokenCode(doctor_id, tokenNumber);
            const tokenInsert = await client.query(
                `INSERT INTO queue_tokens (appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id)
                 VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                 RETURNING id, appointment_id, doctor_id, token_number, token_code, queue_date, tenant_id, created_at`,
                [appointment.id, doctor_id, tokenNumber, tokenCode, tenantId]
            );

            return {
                patient: createdPatient || { id: resolvedPatientId },
                appointment,
                token: tokenInsert.rows[0],
            };
        });

        return res.status(201).json({
            success: true,
            message: "Reception booking completed successfully",
            data,
        });
    } catch (error) {
        if (
            error.message === "Patient not found" ||
            error.message === "Provide patient_id or patient_name and patient_phone" ||
            error.message === "Slot not found for this doctor and tenant"
        ) {
            return res.status(404).json({ success: false, message: error.message });
        }

        if (error.message === "Reached max capacity. Please book for tomorrow's slot") {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to complete reception booking",
            error: error.message,
        });
    }
};

module.exports = {
    bookFromReception,
};
