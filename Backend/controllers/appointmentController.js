const { withTransaction } = require("../DB/db");

const createAppointment = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const role = req.user?.role;
        const userId = req.user?.userId;
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

        const insertResult = await withTransaction(async (client) => {
            let resolvedDoctorId = doctor_id;
            if (role === "DOCTOR") {
                const ownDoctor = await client.query(
                    "SELECT id FROM doctors WHERE user_id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
                    [userId, tenantId]
                );
                if (ownDoctor.rowCount === 0) {
                    throw Object.assign(new Error("Doctor profile not found"), { status: 404 });
                }
                resolvedDoctorId = ownDoctor.rows[0].id;
            }

            const patientCheck = await client.query(
                "SELECT id FROM patients WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
                [patient_id, tenantId]
            );
            if (patientCheck.rowCount === 0) {
                throw Object.assign(new Error("Patient not found"), { status: 404 });
            }

            const slotCheck = await client.query(
                `SELECT id, doctor_id, slot_date, max_patients
                 FROM time_slots
                 WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3 AND is_deleted = FALSE
                 FOR UPDATE`,
                [slot_id, resolvedDoctorId, tenantId]
            );
            if (slotCheck.rowCount === 0) {
                throw Object.assign(new Error("Slot not found for this doctor and tenant"), { status: 404 });
            }

            const slot = slotCheck.rows[0];
            const countResult = await client.query(
                "SELECT COUNT(*)::int AS total FROM appointments WHERE slot_id = $1 AND tenant_id = $2 AND is_deleted = FALSE",
                [slot_id, tenantId]
            );
            const currentCount = countResult.rows[0].total;

            if (currentCount >= slot.max_patients) {
                throw Object.assign(new Error("Reached max capacity. Please book for tomorrow's slot"), { status: 400 });
            }

            return client.query(
                `INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, tenant_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, patient_id, doctor_id, slot_id, appointment_date, tenant_id, created_at`,
                [patient_id, resolvedDoctorId, slot_id, slot.slot_date, tenantId, userId]
            );
        });

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            data: insertResult.rows[0],
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : "Failed to book appointment",
            error: error.message,
        });
    }
};

module.exports = {
    createAppointment,
};
