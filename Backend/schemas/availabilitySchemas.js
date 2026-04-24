const { z } = require("zod");

const availabilityCreateSchema = z.object({
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
}).strict("Unexpected fields in request body");

const availabilityUpdateSchema = z.object({
    day_of_week: z.coerce.number().int().min(0).max(6).optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
}).strict("Unexpected fields in request body");

module.exports = {
    availabilityCreateSchema,
    availabilityUpdateSchema,
};
