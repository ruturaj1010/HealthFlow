const { withTransaction } = require("../DB/db");

const toMinutes = (timeValue) => {
    const [hours, minutes] = String(timeValue).split(":").map(Number);
    return (hours * 60) + minutes;
};

const toTimeString = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
};

const generateSlots = async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { doctor_id, date } = req.body;
        const intervalMinutes = 30;
        const maxPatients = Number(req.body.max_patients || process.env.DEFAULT_SLOT_MAX_PATIENTS || 1);

        if (!tenantId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!doctor_id || !date) {
            return res.status(400).json({
                success: false,
                message: "doctor_id and date are required",
            });
        }

        if (Number.isNaN(maxPatients) || maxPatients <= 0) {
            return res.status(400).json({ success: false, message: "max_patients must be a positive number" });
        }

        const insertedSlots = await withTransaction(async (client) => {
            const doctorCheck = await client.query(
                "SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE LIMIT 1",
                [doctor_id, tenantId]
            );
            if (doctorCheck.rowCount === 0) {
                throw Object.assign(new Error("Doctor not found"), { status: 404 });
            }

            const hospitalResult = await client.query(
                "SELECT opening_time, closing_time FROM hospitals WHERE id = $1 AND is_deleted = FALSE LIMIT 1",
                [tenantId]
            );
            if (hospitalResult.rowCount === 0) {
                throw Object.assign(new Error("Hospital not found for tenant"), { status: 404 });
            }

            const dayResult = await client.query("SELECT EXTRACT(DOW FROM $1::date) AS day_of_week", [date]);
            const dayOfWeek = Number(dayResult.rows[0].day_of_week);

            const availabilityResult = await client.query(
                `SELECT start_time, end_time
                 FROM doctor_availability
                 WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $3 AND is_deleted = FALSE
                 LIMIT 1`,
                [doctor_id, dayOfWeek, tenantId]
            );
            if (availabilityResult.rowCount === 0) {
                return [];
            }

            const hospitalOpen = hospitalResult.rows[0].opening_time;
            const hospitalClose = hospitalResult.rows[0].closing_time;
            const doctorStart = availabilityResult.rows[0].start_time;
            const doctorEnd = availabilityResult.rows[0].end_time;

            const effectiveStart = Math.max(toMinutes(hospitalOpen), toMinutes(doctorStart));
            const effectiveEnd = Math.min(toMinutes(hospitalClose), toMinutes(doctorEnd));

            if (effectiveStart >= effectiveEnd) {
                return [];
            }

            const rows = [];
            for (let cursor = effectiveStart; cursor + intervalMinutes <= effectiveEnd; cursor += intervalMinutes) {
                const startTime = toTimeString(cursor);
                const insertResult = await client.query(
                    `INSERT INTO time_slots (doctor_id, slot_date, start_time, max_patients, tenant_id, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (doctor_id, slot_date, start_time) DO NOTHING
                     RETURNING id, doctor_id, slot_date, start_time, max_patients, tenant_id`,
                    [doctor_id, date, startTime, maxPatients, tenantId, req.user.userId]
                );

                if (insertResult.rowCount > 0) {
                    rows.push(insertResult.rows[0]);
                }
            }

            return rows;
        });

        if (insertedSlots.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No slots available",
                data: [],
            });
        }

        return res.status(201).json({
            success: true,
            message: "Slots generated successfully",
            data: insertedSlots,
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : "Failed to generate slots",
            error: error.message,
        });
    }
};

module.exports = {
    generateSlots,
};
