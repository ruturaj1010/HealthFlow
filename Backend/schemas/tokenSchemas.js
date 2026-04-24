const { z } = require("zod");

const tokenCreateSchema = z.object({
    appointment_id: z.string().uuid(),
    doctor_id: z.string().uuid(),
}).strict("Unexpected fields in request body");

module.exports = {
    tokenCreateSchema,
};
