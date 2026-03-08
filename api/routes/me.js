const express = require("express");
const UsersController = require("../controllers/users")
const router = express.Router();

router.get("/", UsersController.showUser);
router.patch("/theme", UsersController.updateThemePreference);

module.exports = router;
