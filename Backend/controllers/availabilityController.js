const { pool } = require("../DB/db");

const isValidTimeRange = (startTime, endTime) => startTime < endTime;

const createAvailability = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const doctorId = req.params.id;
        const { day_of_week, start_time, end_time } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (day_of_week === undefined || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: "day_of_week, start_time and end_time are required",
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        if (day_of_week < 0 || day_of_week > 6) {
            return res.status(400).json({ success: false, message: "day_of_week must be between 0 and 6" });
        }

        if (!isValidTimeRange(start_time, end_time)) {
            return res.status(400).json({ success: false, message: "start_time must be less than end_time" });
        }

        const doctorCheck = await pool.query(
            "SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
            [doctorId, tenantId]
        );
        if (doctorCheck.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        const duplicateCheck = await pool.query(
            `SELECT id
             FROM doctor_availability
             WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $3 AND is_deleted = FALSE
             LIMIT 1`,
            [doctorId, day_of_week, tenantId]
        );
        if (duplicateCheck.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Availability for this day already exists for the doctor",
            });
        }

        const result = await pool.query(
            `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, doctor_id, day_of_week, start_time, end_time, tenant_id`,
            [doctorId, day_of_week, start_time, end_time, tenantId, req.user.userId]
        );

        return res.status(201).json({
            success: true,
            message: "Doctor availability created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create doctor availability",
            error: error.message,
        });
    }
};

const getDoctorAvailability = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const doctorId = req.params.id;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "tenant_id")) {
            return res.status(400).json({
                success: false,
                message: "tenant_id is not allowed in request body",
            });
        }

        const doctorCheck = await pool.query(
            "SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
            [doctorId, tenantId]
        );
        if (doctorCheck.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        const result = await pool.query(
            `SELECT id, doctor_id, day_of_week, start_time, end_time, tenant_id
             FROM doctor_availability
             WHERE doctor_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
             ORDER BY day_of_week ASC`,
            [doctorId, tenantId]
        );

        return res.status(200).json({
            success: true,
            message: "Doctor availability fetched successfully",
            data: result.rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch doctor availability",
            error: error.message,
        });
    }
};

const updateAvailability = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const availabilityId = req.params.id;
        const { day_of_week, start_time, end_time } = req.body;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const existing = await pool.query(
            `SELECT id, doctor_id, day_of_week, start_time, end_time
             FROM doctor_availability
             WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
            [availabilityId, tenantId]
        );
        if (existing.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Availability not found" });
        }

        const current = existing.rows[0];
        const nextDay = day_of_week !== undefined ? day_of_week : current.day_of_week;
        const nextStart = start_time || current.start_time;
        const nextEnd = end_time || current.end_time;

        if (nextDay < 0 || nextDay > 6) {
            return res.status(400).json({ success: false, message: "day_of_week must be between 0 and 6" });
        }

        if (!isValidTimeRange(nextStart, nextEnd)) {
            return res.status(400).json({ success: false, message: "start_time must be less than end_time" });
        }

        const duplicateCheck = await pool.query(
            `SELECT id
             FROM doctor_availability
             WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $3 AND id != $4 AND is_deleted = FALSE
             LIMIT 1`,
            [current.doctor_id, nextDay, tenantId, availabilityId]
        );
        if (duplicateCheck.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Availability for this day already exists for the doctor",
            });
        }

        const result = await pool.query(
            `UPDATE doctor_availability
             SET day_of_week = $1, start_time = $2, end_time = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND tenant_id = $5
               AND is_deleted = FALSE
             RETURNING id, doctor_id, day_of_week, start_time, end_time, tenant_id`,
            [nextDay, nextStart, nextEnd, availabilityId, tenantId]
        );

        return res.status(200).json({
            success: true,
            message: "Availability updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update availability",
            error: error.message,
        });
    }
};

const deleteAvailability = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const availabilityId = req.params.id;

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await pool.query(
            `UPDATE doctor_availability
             SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
             RETURNING id`,
            [availabilityId, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Availability not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Availability deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete availability",
            error: error.message,
        });
    }
};

module.exports = {
    createAvailability,
    getDoctorAvailability,
    updateAvailability,
    deleteAvailability,
};
