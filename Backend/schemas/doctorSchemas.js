const { z } = require("zod");

const doctorCreateSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().transform((v) => v.toLowerCase()),
    password: z.string().min(8).max(128),
    specialization: z.string().trim().min(2).max(100),
    consultation_fee: z.coerce.number().min(0),
}).strict("Unexpected fields in request body");

const doctorUpdateSchema = z.object({
    specialization: z.string().trim().min(2).max(100).optional(),
    consultation_fee: z.coerce.number().min(0).optional(),
}).strict("Unexpected fields in request body");

module.exports = {
    doctorCreateSchema,
    doctorUpdateSchema,
};
