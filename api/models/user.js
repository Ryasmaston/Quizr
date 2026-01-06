const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  authId: {
    type: String,
    required: true,
    unique: true
  },

  username: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    trim: true
  },

  profile_pic: {
    type: String
  },

  created_at: {
    type: Date,
    default: Date.now
  },

  quizzes: {
    type: Number,
    default: 0,
    min: 0
  }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
