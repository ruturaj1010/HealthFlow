const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const { patientCreateSchema, patientUpdateSchema } = require("../schemas/patientSchemas");
const {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient,
} = require("../controllers/patientController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]));

router.post("/", validateBody(patientCreateSchema), createPatient);
router.get("/", getPatients);
router.get("/:id", getPatientById);
router.put("/:id", validateBody(patientUpdateSchema), updatePatient);

module.exports = router;
