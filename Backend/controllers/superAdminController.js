const bcrypt = require("bcrypt");
const { pool, withTransaction } = require("../DB/db");

const createHospital = async (req, res) => {
    try {
        const { name, email, subdomain, adminName, adminEmail, adminPassword } = req.body;

        const duplicateCheck = await pool.query(
            `SELECT id
             FROM hospitals
             WHERE (email = $1 OR LOWER(subdomain) = $2) AND is_deleted = FALSE
             LIMIT 1`,
            [email, subdomain]
        );

        if (duplicateCheck.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Hospital email or subdomain already exists",
            });
        }

        const userExists = await pool.query(
            "SELECT id FROM users WHERE email = $1 AND is_deleted = FALSE LIMIT 1",
            [adminEmail]
        );
        if (userExists.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Admin email already exists",
            });
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        const data = await withTransaction(async (client) => {
            const hospitalInsert = await client.query(
                `INSERT INTO hospitals (name, email, subdomain, created_by)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, name, email, subdomain, opening_time, closing_time`,
                [name, email, subdomain, req.user.userId]
            );

            const hospital = hospitalInsert.rows[0];

            const adminInsert = await client.query(
                `INSERT INTO users (name, email, password, role, tenant_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, name, email, phone, role, tenant_id, created_at`,
                [adminName, adminEmail, passwordHash, "HOSPITAL_ADMIN", hospital.id, req.user.userId]
            );

            return {
                hospital,
                hospitalAdmin: adminInsert.rows[0],
            };
        });

        return res.status(201).json({
            success: true,
            message: "Hospital created successfully",
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create hospital",
            error: error.message,
        });
    }
};

const getHospitals = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, subdomain, opening_time, closing_time, status, created_at
             FROM hospitals
             WHERE is_deleted = FALSE
             ORDER BY created_at DESC`
        );

        return res.status(200).json({
            success: true,
            message: "Hospitals fetched successfully",
            data: result.rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch hospitals",
            error: error.message,
        });
    }
};

const getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, name, email, subdomain, opening_time, closing_time, status, created_at
             FROM hospitals
             WHERE id = $1 AND is_deleted = FALSE`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hospital fetched successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch hospital",
            error: error.message,
        });
    }
};

const updateHospitalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            `UPDATE hospitals
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
               AND is_deleted = FALSE
             RETURNING id, name, email, subdomain, opening_time, closing_time, status, created_at`,
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hospital status updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update hospital status",
            error: error.message,
        });
    }
};

module.exports = {
    createHospital,
    getHospitals,
    getHospitalById,
    updateHospitalStatus,
};
