const { z } = require("zod");

const receptionBookSchema = z.object({
    patient_id: z.string().uuid().optional(),
    patient_name: z.string().trim().min(2).max(100).optional(),
    patient_phone: z.string().trim().min(7).max(15).optional(),
    doctor_id: z.string().uuid(),
    slot_id: z.string().uuid(),
}).strict("Unexpected fields in request body");

module.exports = {
    receptionBookSchema,
};
