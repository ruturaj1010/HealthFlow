const express = require("express");
const { register, patientRegister, login, me } = require("../controllers/authController");
const { validateBody } = require("../middleware/validateSchema");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiters");
const {
    registerSchema,
    loginSchema,
    patientRegisterSchema,
} = require("../schemas/authSchemas");

const router = express.Router();

router.post("/register", authMiddleware, validateBody(registerSchema), register);
router.post("/patient-register", authLimiter, validateBody(patientRegisterSchema), patientRegister);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.get("/me", authMiddleware, me);

module.exports = router;
