const User = require("../models/user");
const Quiz = require("../models/quiz");

// function added to escape user input to build a RegExp for partial matching
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createUser(req, res) {
  const username = req.body.username;
  const authId = req.user.uid;
  const email = req.user.email;
  try {
    const user = new User({ username, email, authId });
    await user.save();
    res.status(201).json({
      message: "User created",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
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
    const currentUser = await User.findOne({ authId: req.user.uid });
    if (!currentUser || currentUser._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { username, profile_pic },
      { new: true }
    ).select("username profile_pic quizzes created_at");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update profile", error: err.message });
  }
}

async function checkUsernameAvailability(req, res) {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const exists = await User.exists({ username });
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
    const user = await User.findOne({ authId: req.user.uid })
      .select("username profile_pic favourites")
      .populate({
        path: "favourites",
        select: "title category created_by",
        populate: {path: "created_by", select: "username"}
      })

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load profile", error: error.message });
  }
}

// Search users by partial username for navbar search dropdown
// Returns minimal fields only to keep responses light
async function searchUsers(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(200).json({ users: [] });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const users = await User.find({ username: regex })
      .select("username profile_pic")
      .limit(8);

    return res.status(200).json({
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        profile_pic: u.profile_pic || null,
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
    const user = await User.findById(req.params.userId).select(
      "username profile_pic created_at"
    );

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
    const { username } = req.params;
    const user = await User.findOne({ username }).select("_id");
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
  try{
    const user = await User.findByIdAndDelete(req.params.userId);
    if(!user){
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json({ message: "User deleted" })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user", error: error.message})
  }
}

// Favourites

async function addFavourite(req, res) {
  try{
    const quiz = await Quiz.findById(req.params.quizId);
    if(!quiz) {
      return res.status(404).json({message: "Quiz not found"})
    }
    const user = await User.findOneAndUpdate(
      {authId: req.user.uid},
      {$addToSet: {favourites: quiz._id}},
      {new: true}
    );
    if (!user) {
      return res.status(404).json({message: "User not found"})
    }
    res.status(200).json({message: "Quiz added to favourites"})
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Could not add to favourites", error: error.message})
  }
}

async function removeFavourite(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if(!quiz) {
      return res.status(404).json({message: "Quiz not found"})
    }
    const user = await User.findOneAndUpdate(
      {authId: req.user.uid},
      {$pull: {favourites: quiz._id}},
      {new: true}
    );
    if (!user) {
      return res.status(404).json({message: "User not found"})
    }
    res.status(200).json({message: "Quiz removed from favourites"})
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Could not remove from favourites", error: error.message})
  }
}

const UsersController = {
  createUser: createUser,
  checkUsernameAvailability: checkUsernameAvailability,
  updateUser: updateUser,
  showUser: showUser,
  searchUsers: searchUsers, //used by navbar user search dropdown
  getUserById: getUserById,
  getUserIdByUsername: getUserIdByUsername,
  deleteUser: deleteUser,
  addFavourite: addFavourite,
  removeFavourite: removeFavourite
};

module.exports = UsersController;
