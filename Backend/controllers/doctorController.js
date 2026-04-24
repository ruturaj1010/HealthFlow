const bcrypt = require("bcrypt");
const { pool, withTransaction } = require("../DB/db");

const createDoctor = async (req, res) => {
    try {
        const { name, email, password, specialization, consultation_fee } = req.body;
        const tenantId = req.user?.tenant_id;

        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!name || !email || !password || !specialization || consultation_fee === undefined) {
            return res.status(400).json({
                success: false,
                message: "name, email, password, specialization and consultation_fee are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1 LIMIT 1",
            [email]
        );
        if (existingUser.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const data = await withTransaction(async (client) => {
            const userInsert = await client.query(
                `INSERT INTO users (name, email, password, role, tenant_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, name, email, phone, role, tenant_id, created_at`,
                [name, email, passwordHash, "DOCTOR", tenantId]
            );

            const user = userInsert.rows[0];

            const doctorInsert = await client.query(
                `INSERT INTO doctors (user_id, specialization, consultation_fee, tenant_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, user_id, specialization, consultation_fee, tenant_id, created_at`,
                [user.id, specialization, consultation_fee, tenantId]
            );

            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    tenant_id: user.tenant_id,
                    created_at: user.created_at,
                },
                doctor: doctorInsert.rows[0],
            };
        });

        return res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create doctor",
            error: error.message,
        });
    }
};

const getDoctors = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const result = await pool.query(
            `SELECT
                d.id,
                d.user_id,
                u.name,
                u.email,
                u.phone,
                d.specialization,
                d.consultation_fee,
                d.tenant_id,
                d.created_at
             FROM doctors d
             JOIN users u ON u.id = d.user_id
             WHERE d.tenant_id = $1
             ORDER BY d.created_at DESC`,
            [tenantId]
        );

        return res.status(200).json({
            success: true,
            message: "Doctors fetched successfully",
            data: result.rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch doctors",
            error: error.message,
        });
    }
};

const getDoctorById = async (req, res) => {
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
            `SELECT
                d.id,
                d.user_id,
                u.name,
                u.email,
                u.phone,
                d.specialization,
                d.consultation_fee,
                d.tenant_id,
                d.created_at
             FROM doctors d
             JOIN users u ON u.id = d.user_id
             WHERE d.id = $1 AND d.tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Doctor fetched successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch doctor",
            error: error.message,
        });
    }
};

const updateDoctor = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { id } = req.params;
        const { specialization, consultation_fee } = req.body;

        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const updates = [];
        const values = [];
        let index = 1;

        if (specialization !== undefined) {
            updates.push(`specialization = $${index++}`);
            values.push(specialization);
        }

        if (consultation_fee !== undefined) {
            updates.push(`consultation_fee = $${index++}`);
            values.push(consultation_fee);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required: specialization or consultation_fee",
            });
        }

        values.push(id);
        values.push(tenantId);

        const result = await pool.query(
            `UPDATE doctors
             SET ${updates.join(", ")}
             WHERE id = $${index++} AND tenant_id = $${index}
             RETURNING id, user_id, specialization, consultation_fee, tenant_id, created_at`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Doctor updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update doctor",
            error: error.message,
        });
    }
};

module.exports = {
    createDoctor,
    getDoctors,
    getDoctorById,
    updateDoctor,
};
