const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const { appointmentCreateSchema } = require("../schemas/appointmentSchemas");
const { createAppointment } = require("../controllers/appointmentController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]));

router.post("/", validateBody(appointmentCreateSchema), createAppointment);

module.exports = router;
