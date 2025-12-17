const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

const UsersController = require("../controllers/users");

router.post("/", UsersController.createUser);
router.get("/me", requireAuth, UsersController.showUser);
router.get("/:userId", UsersController.getUserById)
router.delete("/:userId", UsersController.deleteUser)

module.exports = router;
