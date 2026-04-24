const { z } = require("zod");

const slotGenerateSchema = z.object({
    doctor_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    max_patients: z.coerce.number().int().min(1).max(500).optional(),
}).strict("Unexpected fields in request body");

module.exports = {
    slotGenerateSchema,
};
