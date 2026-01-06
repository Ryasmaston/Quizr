const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const FriendsController = require("../controllers/friends")
const router = express.Router()

router.post("/:userId", requireAuth, FriendsController.sendRequest);
router.patch("/:friendId/accept", requireAuth, FriendsController.acceptRequest);
router.delete("/:userId", requireAuth, FriendsController.removeRequest);
router.get("/", requireAuth, FriendsController.listFriends);
router.get("/pending/all", requireAuth, FriendsController.pendingRequests);

module.exports = router
