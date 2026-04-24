const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const { tokenCreateSchema } = require("../schemas/tokenSchemas");
const {
    createToken,
    skipToken,
    holdToken,
    callNextToken,
} = require("../controllers/tokenController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]));

router.post("/", validateBody(tokenCreateSchema), createToken);
router.post("/:id/skip", skipToken);
router.post("/:id/hold", holdToken);
router.post("/:id/call-next", callNextToken);

module.exports = router;
