const express = require("express");
const userController = require("../controllers/userController")

const router = express.Router();


router.post('/', userController.userLogin);


module.exports = router;