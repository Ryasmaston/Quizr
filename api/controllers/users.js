const User = require("../models/user");

function create(req, res) {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  const user = new User({ username, email, password });
  user
    .save()
    .then((user) => {
      console.log("User created, id:", user._id.toString());
      res.status(201).json({ message: "OK" });
    })
    .catch((err) => {
      console.error(err);
      res.status(400).json({ message: "Something went wrong" });
    });
}

async function show(req, res) {
  try {
    const user = await User.findById(req.user_id).select(
      "username profile_pic quizzes"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load profile" });
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
    res.status(500).json({ message: "Unable to load profile" });
  }
}

const UsersController = {
  create: create,
  show: show,
  getUserById: getUserById
};

module.exports = UsersController;
