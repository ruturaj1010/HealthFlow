const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { bookFromReception } = require("../controllers/receptionController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]));

router.post("/book", bookFromReception);

module.exports = router;
