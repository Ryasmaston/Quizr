const mongoose = require("mongoose");
const User = require("../models/user");
const Quiz = require("../models/quiz");
const { executeUserDeletion } = require("../services/userDeletion");

const PLACEHOLDER_AUTH_ID = "deleted-user";

// Only allows alphanumeric, single spaces (not leading/trailing), dashes, and dots
const VALID_USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 .\-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
const CONSECUTIVE_SPACES = /  /;
const RESERVED_USERNAMES = ["__deleted__"];

// function added to escape user input to build a RegExp for partial matching
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createUser(req, res) {
  const username = req.body.username?.trim();
  const authId = req.user.uid;
  const email = req.user.email;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return res.status(400).json({ message: "This username is not allowed" });
  }
  if (!VALID_USERNAME_REGEX.test(username) || CONSECUTIVE_SPACES.test(username)) {
    return res.status(400).json({ message: "Username contains invalid characters" });
  }

  try {
    const exists = await User.exists({ "user_data.username": username });
    if (exists) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const user = new User({
      authId,
      user_data: { username, email }
    });
    await user.save();
    res.status(201).json({
      message: "User created",
      user: {
        id: user._id,
        username: user.user_data.username,
        email: user.user_data.email
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username already taken" });
    }
    console.error(error);
    res.status(400).json({
      message: "Error creating user",
      error: error.message
    })
  }
}

async function updateUser(req, res) {
  try {
    const { username, profile_pic } = req.body;
    const trimmedUsername = username?.trim();

    if (!trimmedUsername) {
      return res.status(400).json({ message: "Username is required" });
    }
    if (RESERVED_USERNAMES.includes(trimmedUsername)) {
      return res.status(400).json({ message: "This username is not allowed" });
    }
    if (!VALID_USERNAME_REGEX.test(trimmedUsername) || CONSECUTIVE_SPACES.test(trimmedUsername)) {
      return res.status(400).json({ message: "Username contains invalid characters" });
    }

    const currentUser = await User.findOne({ authId: req.user.uid });
    if (!currentUser || currentUser._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Check uniqueness (exclude current user)
    const taken = await User.exists({
      "user_data.username": trimmedUsername,
      _id: { $ne: currentUser._id }
    });
    if (taken) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        "user_data.username": trimmedUsername,
        "user_data.profile_pic": profile_pic
      },
      { new: true }
    ).select("user_data.username user_data.profile_pic quizzes user_data.created_at");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Username already taken" });
    }
    console.error(err);
    res.status(500).json({ message: "Unable to update profile", error: err.message });
  }
}

async function checkUsernameAvailability(req, res) {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return res.status(200).json({ available: false });
  }
  if (!VALID_USERNAME_REGEX.test(username) || CONSECUTIVE_SPACES.test(username)) {
    return res.status(200).json({ available: false, message: "Invalid format" });
  }

  try {
    const exists = await User.exists({ "user_data.username": username });
    return res.status(200).json({ available: !exists });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error checking username",
      error: error.message
    });
  }
}

async function showUser(req, res) {
  try {
    const userDoc = await User.findOne({ authId: req.user.uid })
      .select("user_data preferences")
      .populate({
        path: "preferences.favourites",
        select: "title category created_by questions req_to_pass allow_multiple_correct require_all_correct lock_answers difficulty favourited_count",
        populate: { path: "created_by", select: "user_data.username authId" }
      })

    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userDoc.toObject();
    const favourites = Array.isArray(user.preferences?.favourites)
      ? user.preferences.favourites
      : [];
    const favouriteIds = favourites
      .map((fav) => (typeof fav === "string" ? fav : fav?._id))
      .filter(Boolean);
    const objectIds = favouriteIds
      .map((id) => (typeof id === "string" ? new mongoose.Types.ObjectId(id) : id))
      .filter(Boolean);
    if (objectIds.length > 0) {
      const counts = await User.aggregate([
        { $match: { "preferences.favourites": { $in: objectIds } } },
        { $unwind: "$preferences.favourites" },
        { $match: { "preferences.favourites": { $in: objectIds } } },
        { $group: { _id: "$preferences.favourites", count: { $sum: 1 } } }
      ]);
      const countMap = new Map(
        counts.map((entry) => [String(entry._id), entry.count])
      );
      favourites.forEach((fav) => {
        if (!fav || typeof fav !== "object") return;
        const favId = fav._id ? String(fav._id) : null;
        if (!favId) return;
        fav.favourited_count = countMap.get(favId) || 0;
      });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load profile", error: error.message });
  }
}

async function updateThemePreference(req, res) {
  try {
    const { theme } = req.body || {};
    const allowedThemes = new Set(["light", "dark", "system"]);

    if (!allowedThemes.has(theme)) {
      return res.status(400).json({ message: "Invalid theme" });
    }

    const user = await User.findOne({ authId: req.user.uid }).select("authId preferences");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.authId === PLACEHOLDER_AUTH_ID) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    user.preferences = user.preferences || {};
    user.preferences.theme = theme;
    await user.save();

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to update theme", error: error.message });
  }
}

// Search users by partial username for navbar search dropdown
// Returns minimal fields only to keep responses light
async function searchUsers(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.status(200).json({ users: [] });
    }

    const regex = new RegExp("^" + escapeRegex(q), "i");

    const users = await User.find({
      "user_data.username": regex,
      authId: { $ne: PLACEHOLDER_AUTH_ID }
    })
      .select("user_data.username user_data.profile_pic")
      .limit(8);

    return res.status(200).json({
      users: users.map((u) => ({
        id: u._id,
        username: u.user_data.username,
        profile_pic: u.user_data.profile_pic || null,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error searching users",
      error: error.message,
    });
  }
}

async function getUserById(req, res) {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      authId: { $ne: PLACEHOLDER_AUTH_ID }
    }).select("user_data.username user_data.profile_pic user_data.created_at");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load profile", error: err.message });
  }
}

async function getUserIdByUsername(req, res) {
  try {
    // URLs use underscores in place of spaces
    const username = req.params.username.replace(/_/g, ' ');
    const user = await User.findOne({
      "user_data.username": username,
      authId: { $ne: PLACEHOLDER_AUTH_ID }
    }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to fetch userId", error: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    const currentUser = await User.findOne({ authId: req.user.uid });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (currentUser._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await executeUserDeletion(currentUser, req.body?.mode);
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user", error: error.message })
  }
}

async function scheduleDeletion(req, res) {
  try {
    const { mode } = req.body || {};
    const allowedModes = new Set(["delete_quizzes", "preserve_quizzes"]);
    if (!allowedModes.has(mode)) {
      return res.status(400).json({ message: "Invalid deletion mode" });
    }

    const user = await User.findOne({ authId: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    if (user.authId === PLACEHOLDER_AUTH_ID) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const requestedAt = new Date();
    const scheduledFor = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const deletionData = {
      requested_at: requestedAt,
      scheduled_for: scheduledFor,
      mode
    };

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "user_data.status": "pending_deletion",
          "user_data.deletion": deletionData
        }
      }
    );

    user.user_data.status = "pending_deletion";
    user.user_data.deletion = deletionData;

    res.status(200).json({
      message: "Deletion scheduled",
      user: {
        status: user.user_data.status,
        deletion: user.user_data.deletion
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error scheduling deletion", error: error.message });
  }
}

async function cancelDeletion(req, res) {
  try {
    const user = await User.findOneAndUpdate(
      { authId: req.user.uid, "user_data.status": "pending_deletion" },
      { $set: { "user_data.status": "active" }, $unset: { "user_data.deletion": "" } },
      { new: true }
    );
    if (!user) {
      const exists = await User.exists({ authId: req.user.uid });
      if (!exists) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(400).json({ message: "No deletion scheduled" });
    }

    res.status(200).json({
      message: "Deletion cancelled",
      user: {
        status: user.user_data.status,
        deletion: user.user_data.deletion
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error cancelling deletion", error: error.message });
  }
}

async function executeDeletion(req, res) {
  try {
    const user = await User.findOne({ authId: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await executeUserDeletion(user, req.body?.mode);
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user", error: error.message })
  }
}

// Favourites

async function addFavourite(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }
    const user = await User.findOneAndUpdate(
      { authId: req.user.uid },
      { $addToSet: { "preferences.favourites": quiz._id } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json({ message: "Quiz added to favourites" })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not add to favourites", error: error.message })
  }
}

async function removeFavourite(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }
    const user = await User.findOneAndUpdate(
      { authId: req.user.uid },
      { $pull: { "preferences.favourites": quiz._id } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json({ message: "Quiz removed from favourites" })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not remove from favourites", error: error.message })
  }
}

const UsersController = {
  createUser: createUser,
  checkUsernameAvailability: checkUsernameAvailability,
  updateUser: updateUser,
  showUser: showUser,
  updateThemePreference: updateThemePreference,
  searchUsers: searchUsers, //used by navbar user search dropdown
  getUserById: getUserById,
  getUserIdByUsername: getUserIdByUsername,
  deleteUser: deleteUser,
  scheduleDeletion: scheduleDeletion,
  cancelDeletion: cancelDeletion,
  executeDeletion: executeDeletion,
  addFavourite: addFavourite,
  removeFavourite: removeFavourite
};

module.exports = UsersController;
