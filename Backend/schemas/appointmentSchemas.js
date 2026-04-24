const { z } = require("zod");

const appointmentCreateSchema = z.object({
    patient_id: z.string().uuid(),
    doctor_id: z.string().uuid(),
    slot_id: z.string().uuid(),
}).strict("Unexpected fields in request body");

module.exports = {
    appointmentCreateSchema,
};
