const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireActiveUser = require("../middleware/requireActiveUser");
const router = express.Router();

const UsersController = require("../controllers/users");

router.get("/availability", UsersController.checkUsernameAvailability);
router.post("/", requireAuth, UsersController.createUser);
router.get("/me", requireAuth, UsersController.showUser);
router.post("/me/deletion", requireAuth, UsersController.scheduleDeletion);
router.post("/me/deletion/cancel", requireAuth, UsersController.cancelDeletion);
router.post("/me/deletion/execute", requireAuth, UsersController.executeDeletion);
router.get("/search", requireAuth, UsersController.searchUsers);  //user search bar
router.get("/username/:username", requireAuth, UsersController.getUserIdByUsername);
router.patch("/:userId", requireAuth, requireActiveUser, UsersController.updateUser);
router.get("/:userId", requireAuth, UsersController.getUserById);
router.delete("/:userId", requireAuth, UsersController.deleteUser);
router.post("/me/favourites/:quizId", requireAuth, requireActiveUser, UsersController.addFavourite);
router.delete("/me/favourites/:quizId", requireAuth, requireActiveUser, UsersController.removeFavourite);

module.exports = router;
