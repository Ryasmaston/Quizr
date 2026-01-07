const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const UsersController = require("../controllers/users")
const router = express.Router();

router.get("/", UsersController.showUser);

module.exports = router;
