const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, withTransaction } = require("../DB/db");

const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    tenant_id: user.tenant_id,
    created_at: user.created_at,
});

const getTenantFromSubdomain = async (req) => {
    const rawHost = req.hostname || req.headers.host || "";
    const hostname = String(rawHost).toLowerCase().split(":")[0];
    const parts = hostname.split(".").filter(Boolean);
    const subdomain = parts.length > 2 ? parts[0] : null;

    if (!subdomain) {
        return null;
    }

    const hospitalResult = await pool.query(
        "SELECT id FROM hospitals WHERE LOWER(subdomain) = $1 LIMIT 1",
        [subdomain]
    );

    if (hospitalResult.rowCount === 0) {
        return null;
    }

    return hospitalResult.rows[0].id;
};

const register = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!req.user?.tenant_id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (role === "PATIENT") {
            return res.status(400).json({
                success: false,
                message: "Use /auth/patient-register for patient signup",
            });
        }
        const tenantId = req.user.tenant_id;

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already in use",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUserResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, role, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, email, phone, role, tenant_id, created_at`,
            [name, email, passwordHash, phone, role, tenantId]
        );
        const user = newUserResult.rows[0];

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: sanitizeUser(user),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to register user",
            error: error.message,
        });
    }
};

const patientRegister = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const tenantId = await getTenantFromSubdomain(req);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Unable to resolve tenant from subdomain",
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already in use",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const data = await withTransaction(async (client) => {
            const userInsert = await client.query(
                `INSERT INTO users (name, email, password, phone, role, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, name, email, phone, role, tenant_id, created_at`,
                [name, email, passwordHash, phone, "PATIENT", tenantId]
            );

            const user = userInsert.rows[0];
            const patientInsert = await client.query(
                `INSERT INTO patients (user_id, name, phone, tenant_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, user_id, name, phone, tenant_id`,
                [user.id, name, phone, tenantId]
            );

            return {
                user,
                patient: patientInsert.rows[0],
            };
        });

        const token = jwt.sign(
            {
                userId: data.user.id,
                role: data.user.role,
                tenant_id: data.user.tenant_id,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            success: true,
            message: "Patient registered successfully",
            data: {
                token,
                user: sanitizeUser(data.user),
                patient: data.patient,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to register patient",
            error: error.message,
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const tenantId = await getTenantFromSubdomain(req);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Unable to resolve tenant from subdomain",
            });
        }

        const userResult = await pool.query(
            `SELECT id, name, email, phone, password, role, tenant_id, created_at
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (userResult.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        if (user.tenant_id !== tenantId) {
            return res.status(403).json({
                success: false,
                message: "User does not belong to this tenant",
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                tenant_id: user.tenant_id,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: sanitizeUser(user),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to login",
            error: error.message,
        });
    }
};

const me = async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const userResult = await pool.query(
            `SELECT id, name, email, phone, role, tenant_id, created_at
             FROM users
             WHERE id = $1`,
            [req.user.userId]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User details fetched successfully",
            data: userResult.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user details",
            error: error.message,
        });
    }
};

module.exports = {
    register,
    patientRegister,
    login,
    me,
};