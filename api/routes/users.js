const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

const UsersController = require("../controllers/users");

router.get("/availability", UsersController.checkUsernameAvailability);
router.post("/", requireAuth, UsersController.createUser);
router.get("/me", requireAuth, UsersController.showUser);
router.get("/username/:username", requireAuth, UsersController.getUserIdByUsername)
router.get("/:userId", requireAuth, UsersController.getUserById);
router.delete("/:userId", requireAuth, UsersController.deleteUser);

module.exports = router;
