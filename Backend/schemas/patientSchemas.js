const { z } = require("zod");

const patientCreateSchema = z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(15),
    user_id: z.string().uuid().optional(),
}).strict("Unexpected fields in request body");

const patientUpdateSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(7).max(15).optional(),
}).strict("Unexpected fields in request body");

module.exports = {
    patientCreateSchema,
    patientUpdateSchema,
};
