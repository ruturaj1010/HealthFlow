const bcrypt = require("bcrypt");
const { pool } = require("../DB/db");

const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    tenant_id: user.tenant_id,
    created_at: user.created_at,
});

const createReceptionist = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "name, email and password are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "role")) {
            return res.status(400).json({
                success: false,
                message: "role is not allowed in request body",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
            [email, tenantId]
        );
        if (existingUser.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, password, phone, role, tenant_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, name, email, phone, role, tenant_id, created_at`,
            [name, email, passwordHash, phone || null, "RECEPTIONIST", tenantId, req.user.userId]
        );

        return res.status(201).json({
            success: true,
            message: "Receptionist created successfully",
            data: sanitizeUser(result.rows[0]),
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create receptionist",
            error: error.message,
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, phone, role, tenant_id, created_at
             FROM users
             WHERE tenant_id = $1 AND is_deleted = FALSE
             ORDER BY created_at DESC`,
            [tenantId]
        );

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: result.rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message,
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, phone, role, tenant_id, created_at
             FROM users
             WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
            [id, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            error: error.message,
        });
    }
};

module.exports = {
    createReceptionist,
    getUsers,
    getUserById,
};
