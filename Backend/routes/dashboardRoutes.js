const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getAdminDashboard, getDoctorDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/admin", authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]), getAdminDashboard);
router.get("/doctor", authMiddleware, roleMiddleware(["DOCTOR"]), getDoctorDashboard);

module.exports = router;
