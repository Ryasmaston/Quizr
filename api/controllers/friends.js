const Friend = require("../models/friend");
const User = require("../models/user");

async function getMongoUserId(req) {
  const firebaseUid = req.user.uid;
  const user = await User.findOne({ authId: firebaseUid });
  if (!user) throw new Error("User not found in database")
  return user._id
}

async function sendRequest(req, res) {
  const { userId } = req.params;
  try {
    const senderId = await getMongoUserId(req);

    if (senderId.toString() === userId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }
    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }
    const friend = await Friend.create({
      user1: senderId,
      user2: userId,
      accepted: false,
    });
    res.status(201).json({ message: "Friend request sent", friend });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Friend request already sent" });
    }
    res.status(500).json({ message: "Error sending request", error: err.message });
  }
}

async function acceptRequest(req, res) {
  const { friendId } = req.params;
  try {
    const userId = await getMongoUserId(req);
    const friend = await Friend.findOneAndUpdate(
      {
        _id: friendId,
        accepted: false,
        $or: [{ user1: userId }, { user2: userId }],
      },
      { accepted: true },
      { new: true }
    );
    if (!friend) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json({ message: "Request accepted", friend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error accepting request", error: err.message });
  }
}

async function removeRequest(req, res) {
  const { userId: otherId } = req.params;
  try {
    const current = await getMongoUserId(req);
    const deleted = await Friend.findOneAndDelete({
      $or: [
        { user1: current, user2: otherId },
        { user1: otherId, user2: current },
      ],
    });
    if (!deleted) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json({ message: "Friend removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing request", error: err.message });
  }
}

// gets all confirmed requests
async function listFriends(req, res) {
  try {
    const userId = await getMongoUserId(req);
    const friends = await Friend.find({
      accepted: true,
      $or: [{ user1: userId }, { user2: userId }],
    }).populate("user1 user2", "user_data.username user_data.profile_pic user_data.created_at");
    res.status(200).json({ friends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading friends", error: err.message });
  }
}

// gets all pending requests
async function pendingRequests(req, res) {
  try {
    const userId = await getMongoUserId(req);
    const requests = await Friend.find({
      accepted: false,
      $or: [{ user1: userId }, { user2: userId }],
    }).populate("user1 user2", "user_data.username user_data.profile_pic user_data.created_at");
    res.status(200).json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading pending requests", error: err.message });
  }
}

const FriendsController = {
  sendRequest: sendRequest,
  acceptRequest: acceptRequest,
  removeRequest: removeRequest,
  listFriends: listFriends,
  pendingRequests: pendingRequests
}
module.exports = FriendsController;
