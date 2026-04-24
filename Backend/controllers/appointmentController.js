const { pool } = require("../DB/db");

const createAppointment = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { patient_id, doctor_id, slot_id } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!patient_id || !doctor_id || !slot_id) {
            return res.status(400).json({
                success: false,
                message: "patient_id, doctor_id and slot_id are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const patientCheck = await pool.query(
            "SELECT id FROM patients WHERE id = $1 AND tenant_id = $2 LIMIT 1",
            [patient_id, tenantId]
        );
        if (patientCheck.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const slotCheck = await pool.query(
            `SELECT id, doctor_id, slot_date, max_patients
             FROM time_slots
             WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3
             LIMIT 1`,
            [slot_id, doctor_id, tenantId]
        );
        if (slotCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Slot not found for this doctor and tenant",
            });
        }

        const slot = slotCheck.rows[0];
        const countResult = await pool.query(
            "SELECT COUNT(*)::int AS total FROM appointments WHERE slot_id = $1 AND tenant_id = $2",
            [slot_id, tenantId]
        );
        const currentCount = countResult.rows[0].total;

        if (currentCount >= slot.max_patients) {
            return res.status(400).json({
                success: false,
                message: "Reached max capacity. Please book for tomorrow's slot",
            });
        }

        const insertResult = await pool.query(
            `INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, tenant_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, patient_id, doctor_id, slot_id, appointment_date, tenant_id, created_at`,
            [patient_id, doctor_id, slot_id, slot.slot_date, tenantId]
        );

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            data: insertResult.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to book appointment",
            error: error.message,
        });
    }
};

module.exports = {
    createAppointment,
};
