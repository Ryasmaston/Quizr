const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    authId: { type: String, required: true, unique: true },
    user_data: {
        username: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        profile_pic: { type: String },
        status: { type: String, enum: ["active", "pending_deletion"], default: "active" },
        deletion: {
            requested_at: Date,
            scheduled_for: Date,
            mode: { type: String, enum: ["delete_quizzes", "preserve_quizzes"] }
        },
        created_at: { type: Date, default: Date.now }
    },
    preferences: {
        favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
        theme: { type: String, enum: ["light", "dark", "system"], default: "light" }
    }
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
