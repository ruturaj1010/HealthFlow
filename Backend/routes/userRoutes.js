const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
    createReceptionist,
    getUsers,
    getUserById,
} = require("../controllers/userController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["HOSPITAL_ADMIN"]));

router.post("/receptionist", createReceptionist);
router.get("/", getUsers);
router.get("/:id", getUserById);

module.exports = router;
