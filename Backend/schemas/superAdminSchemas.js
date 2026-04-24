const { z } = require("zod");

const createHospitalSchema = z
    .object({
        name: z.string().trim().min(2, "Hospital name must be at least 2 characters").max(255, "Hospital name is too long"),
        email: z.string().email("Invalid hospital email").transform((value) => value.toLowerCase()),
        subdomain: z
            .string()
            .trim()
            .min(3, "Subdomain must be at least 3 characters")
            .max(63, "Subdomain is too long")
            .regex(/^[a-z0-9-]+$/, "Subdomain can contain lowercase letters, numbers and hyphens only")
            .transform((value) => value.toLowerCase()),
        adminName: z.string().trim().min(2, "Admin name must be at least 2 characters").max(100, "Admin name is too long"),
        adminEmail: z.string().email("Invalid admin email").transform((value) => value.toLowerCase()),
        adminPassword: z.string().min(8, "Admin password must be at least 8 characters").max(128, "Admin password is too long"),
    })
    .strict("Unexpected fields in request body");

const updateHospitalStatusSchema = z
    .object({
        status: z.enum(["active", "inactive", "suspended"]),
    })
    .strict("Unexpected fields in request body");

module.exports = {
    createHospitalSchema,
    updateHospitalStatusSchema,
};
