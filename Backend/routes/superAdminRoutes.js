const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const {
    createHospitalSchema,
    updateHospitalStatusSchema,
} = require("../schemas/superAdminSchemas");
const {
    createHospital,
    getHospitals,
    getHospitalById,
    updateHospitalStatus,
} = require("../controllers/superAdminController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["SUPER_ADMIN"]));

router.post("/hospitals", validateBody(createHospitalSchema), createHospital);
router.get("/hospitals", getHospitals);
router.get("/hospitals/:id", getHospitalById);
router.patch(
    "/hospitals/:id/status",
    validateBody(updateHospitalStatusSchema),
    updateHospitalStatus
);

module.exports = router;
