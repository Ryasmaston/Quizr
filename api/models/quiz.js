const mongoose = require("mongoose");

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: ["art", "history", "music", "science", "other"], default: "other" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    questions: [{
        question_text: { type: String, required: true },
        options: [{ type: String, required: true }],
        correct_answers: [{ type: Number, required: true }]
    }],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attempts: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        correct: { type: Number },
        attempted_at: { type: Date, default: Date.now }
    }],
    req_to_pass: { type: Number },
    lock_answers: { type: Boolean, default: false },
    allow_multiple_correct: { type: Boolean, default: false },
    require_all_correct: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", QuizSchema);
module.exports = Quiz;
