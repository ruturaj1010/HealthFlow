const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { globalSearch } = require("../controllers/searchController");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware(["HOSPITAL_ADMIN", "RECEPTIONIST"]), globalSearch);

module.exports = router;
