const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const { doctorCreateSchema, doctorUpdateSchema } = require("../schemas/doctorSchemas");
const {
    createDoctor,
    getDoctors,
    getDoctorById,
    updateDoctor,
} = require("../controllers/doctorController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]));

router.post("/", validateBody(doctorCreateSchema), createDoctor);
router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", validateBody(doctorUpdateSchema), updateDoctor);

module.exports = router;
