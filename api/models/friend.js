const mongoose = require("mongoose");

const FriendSchema = new mongoose.Schema(
    {
        user1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        user2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        accepted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

FriendSchema.index(
    { user1: 1, user2: 1 },
    { unique: true }
)

const Friend = mongoose.model("Friend", FriendSchema);
module.exports = Friend;
