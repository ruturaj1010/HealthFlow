const { pool } = require("../DB/db");

const globalSearch = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const query = String(req.query.q || "").trim();

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!query) {
            return res.status(400).json({ success: false, message: "q query parameter is required" });
        }

        const like = `%${query}%`;
        const [patients, doctors, users] = await Promise.all([
            pool.query(
                `SELECT id, name, phone
                 FROM patients
                 WHERE tenant_id = $1 AND is_deleted = FALSE AND (name ILIKE $2 OR phone ILIKE $2)
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [tenantId, like]
            ),
            pool.query(
                `SELECT d.id, u.name, u.email
                 FROM doctors d
                 JOIN users u ON u.id = d.user_id
                 WHERE d.tenant_id = $1 AND d.is_deleted = FALSE AND u.is_deleted = FALSE
                   AND (u.name ILIKE $2 OR u.email ILIKE $2)
                 ORDER BY d.created_at DESC
                 LIMIT 20`,
                [tenantId, like]
            ),
            pool.query(
                `SELECT id, name, email, role
                 FROM users
                 WHERE tenant_id = $1 AND is_deleted = FALSE AND (name ILIKE $2 OR email ILIKE $2)
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [tenantId, like]
            ),
        ]);

        return res.status(200).json({
            success: true,
            message: "Search results fetched successfully",
            data: {
                patients: patients.rows,
                doctors: doctors.rows,
                users: users.rows,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to search records",
            error: error.message,
        });
    }
};

module.exports = { globalSearch };
