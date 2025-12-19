const User = require("../models/user");

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
    const user = await User.findOne({ authId: req.user.uid }).select(
      "username profile_pic quizzes"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load profile", error: error.message });
  }
}

async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.userId).select(
      "username profile_pic quizzes"
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

const UsersController = {
  createUser: createUser,
  checkUsernameAvailability: checkUsernameAvailability,
  showUser: showUser,
  getUserById: getUserById,
  deleteUser: deleteUser
};

module.exports = UsersController;
