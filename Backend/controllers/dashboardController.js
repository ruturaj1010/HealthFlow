const { pool } = require("../DB/db");

const getAdminDashboard = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const [doctors, patients, appointments] = await Promise.all([
            pool.query("SELECT COUNT(*)::int AS total FROM doctors WHERE tenant_id = $1 AND is_deleted = FALSE", [tenantId]),
            pool.query("SELECT COUNT(*)::int AS total FROM patients WHERE tenant_id = $1 AND is_deleted = FALSE", [tenantId]),
            pool.query(
                "SELECT COUNT(*)::int AS total FROM appointments WHERE tenant_id = $1 AND appointment_date = CURRENT_DATE AND is_deleted = FALSE",
                [tenantId]
            ),
        ]);

        return res.status(200).json({
            success: true,
            message: "Admin dashboard fetched successfully",
            data: {
                total_doctors: doctors.rows[0].total,
                total_patients: patients.rows[0].total,
                today_appointments: appointments.rows[0].total,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch admin dashboard",
            error: error.message,
        });
    }
};

const getDoctorDashboard = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const userId = req.user?.userId;

        if (!tenantId || !userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const doctorResult = await pool.query(
            "SELECT id FROM doctors WHERE user_id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
            [userId, tenantId]
        );
        if (doctorResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const doctorId = doctorResult.rows[0].id;
        const [appointments, tokens] = await Promise.all([
            pool.query(
                "SELECT COUNT(*)::int AS total FROM appointments WHERE tenant_id = $1 AND doctor_id = $2 AND appointment_date = CURRENT_DATE AND is_deleted = FALSE",
                [tenantId, doctorId]
            ),
            pool.query(
                "SELECT COUNT(*)::int AS total FROM queue_tokens WHERE tenant_id = $1 AND doctor_id = $2 AND queue_date = CURRENT_DATE AND is_deleted = FALSE AND status IN ('waiting', 'in_progress')",
                [tenantId, doctorId]
            ),
        ]);

        return res.status(200).json({
            success: true,
            message: "Doctor dashboard fetched successfully",
            data: {
                today_appointments: appointments.rows[0].total,
                pending_tokens: tokens.rows[0].total,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch doctor dashboard",
            error: error.message,
        });
    }
};

module.exports = {
    getAdminDashboard,
    getDoctorDashboard,
};
