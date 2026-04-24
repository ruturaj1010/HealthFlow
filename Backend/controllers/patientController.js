const { pool } = require("../DB/db");

const createPatient = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { name, phone, user_id } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "name and phone are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        if (user_id) {
            const userCheck = await pool.query(
                "SELECT id FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1",
                [user_id, tenantId]
            );
            if (userCheck.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Referenced user not found in tenant",
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO patients (user_id, name, phone, tenant_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, user_id, name, phone, tenant_id, created_at`,
            [user_id || null, name, phone, tenantId]
        );

        return res.status(201).json({
            success: true,
            message: "Patient created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create patient",
            error: error.message,
        });
    }
};

const getPatients = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await pool.query(
            `SELECT id, user_id, name, phone, tenant_id, created_at
             FROM patients
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        return res.status(200).json({
            success: true,
            message: "Patients fetched successfully",
            data: result.rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch patients",
            error: error.message,
        });
    }
};

const getPatientById = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await pool.query(
            `SELECT id, user_id, name, phone, tenant_id, created_at
             FROM patients
             WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Patient fetched successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch patient",
            error: error.message,
        });
    }
};

const updatePatient = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { id } = req.params;
        const { name, phone } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
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

        if (name !== undefined) {
            updates.push(`name = $${index++}`);
            values.push(name);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${index++}`);
            values.push(phone);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required: name or phone",
            });
        }

        values.push(id);
        values.push(tenantId);

        const result = await pool.query(
            `UPDATE patients
             SET ${updates.join(", ")}
             WHERE id = $${index++} AND tenant_id = $${index}
             RETURNING id, user_id, name, phone, tenant_id, created_at`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Patient updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update patient",
            error: error.message,
        });
    }
};

module.exports = {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient,
};
