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

  // pending implementation
  profile_pic: {
    type: String
  },

  created_at: {
    type: Date,
    default: Date.now
  },

  favourites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz"
  }]
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
