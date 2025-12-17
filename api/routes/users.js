const express = require("express");
const router = express.Router();

const UsersController = require("../controllers/users");
const tokenChecker = require("../middleware/tokenChecker");

router.post("/", UsersController.createUser);
router.get("/me", tokenChecker, UsersController.showUser);
router.get("/:userId", UsersController.getUserById)
router.delete("/:userId", UsersController.deleteUser)

module.exports = router;
