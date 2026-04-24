const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const {
    availabilityCreateSchema,
    availabilityUpdateSchema,
} = require("../schemas/availabilitySchemas");
const {
    createAvailability,
    getDoctorAvailability,
    updateAvailability,
    deleteAvailability,
} = require("../controllers/availabilityController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]));

router.post("/doctors/:id/availability", validateBody(availabilityCreateSchema), createAvailability);
router.get("/doctors/:id/availability", getDoctorAvailability);
router.put("/availability/:id", validateBody(availabilityUpdateSchema), updateAvailability);
router.delete("/availability/:id", deleteAvailability);

module.exports = router;
