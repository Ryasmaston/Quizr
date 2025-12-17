const express = require("express");
const router = express.Router();

const UsersController = require("../controllers/users");
const tokenChecker = require("../middleware/tokenChecker");

router.post("/", UsersController.create);
router.get("/me", tokenChecker, UsersController.show);
router.get("/:userId", UsersController.getUserById)

module.exports = router;