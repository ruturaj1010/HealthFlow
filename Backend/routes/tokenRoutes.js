const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createToken } = require("../controllers/tokenController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]));

router.post("/", createToken);

module.exports = router;
