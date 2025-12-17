const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

const UsersController = require("../controllers/users");
const tokenChecker = require("../middleware/tokenChecker");

router.post("/me", requireAuth, UsersController.upsertMe);
router.post("/", UsersController.create);
router.get("/:userId", UsersController.getUserById)

module.exports = router;