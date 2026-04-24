const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validateSchema");
const { receptionBookSchema } = require("../schemas/receptionSchemas");
const { bookFromReception } = require("../controllers/receptionController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]));

router.post("/book", validateBody(receptionBookSchema), bookFromReception);

module.exports = router;
