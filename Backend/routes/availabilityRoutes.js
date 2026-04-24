const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
    createAvailability,
    getDoctorAvailability,
    updateAvailability,
    deleteAvailability,
} = require("../controllers/availabilityController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]));

router.post("/doctors/:id/availability", createAvailability);
router.get("/doctors/:id/availability", getDoctorAvailability);
router.put("/availability/:id", updateAvailability);
router.delete("/availability/:id", deleteAvailability);

module.exports = router;
