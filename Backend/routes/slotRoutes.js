const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const { slotGenerateSchema } = require("../schemas/slotSchemas");
const { generateSlots } = require("../controllers/slotController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]));

router.post("/slots/generate", validateBody(slotGenerateSchema), generateSlots);

module.exports = router;
