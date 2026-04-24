const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
    createDoctor,
    getDoctors,
    getDoctorById,
    updateDoctor,
} = require("../controllers/doctorController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]));

router.post("/", createDoctor);
router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", updateDoctor);

module.exports = router;
