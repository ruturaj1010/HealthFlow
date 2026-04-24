const { z } = require("zod");

const registerSchema = z
    .object({
        name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
        email: z.string().email("Invalid email address").transform((value) => value.toLowerCase()),
        password: z.string().min(6, "Password must be at least 8 characters").max(128, "Password is too long"),
        phone: z.string().trim().min(7, "Phone number is too short").max(15, "Phone number is too long").optional(),
        role: z.enum(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "PATIENT"]),
    })
    .strict("Unexpected fields in request body");

const loginSchema = z
    .object({
        email: z.string().email("Invalid email address").transform((value) => value.toLowerCase()),
        password: z.string().min(1, "Password is required"),
    })
    .strict("Unexpected fields in request body");

const patientRegisterSchema = z
    .object({
        name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
        email: z.string().email("Invalid email address").transform((value) => value.toLowerCase()),
        password: z.string().min(6, "Password must be at least 8 characters").max(128, "Password is too long"),
        phone: z.string().trim().min(7, "Phone number is too short").max(15, "Phone number is too long"),
    })
    .strict("Unexpected fields in request body");

module.exports = {
    registerSchema,
    loginSchema,
    patientRegisterSchema,
};
