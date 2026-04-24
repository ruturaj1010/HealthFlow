const express = require("express");
const { register, patientRegister, login, me } = require("../controllers/authController");
const { validateBody } = require("../middleware/validateSchema");
const authMiddleware = require("../middleware/authMiddleware");
const {
    registerSchema,
    loginSchema,
    patientRegisterSchema,
} = require("../schemas/authSchemas");

const router = express.Router();

router.post("/register", authMiddleware, validateBody(registerSchema), register);
router.post("/patient-register", validateBody(patientRegisterSchema), patientRegister);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authMiddleware, me);

module.exports = router;
