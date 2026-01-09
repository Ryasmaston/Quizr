const mongoose = require("mongoose");

const QUIZ_CAT = Object.freeze({
  ART: 'art',
  HISTORY: 'history',
  MUSIC: 'music',
  SCIENCE: 'science',
  OTHER: 'other',
});

const QUIZ_DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [
    {
      question_id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      text: { type: String },
      answers: [
        {
          answer_id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
          text: { type: String, required: true },
          is_correct: { type: Boolean, default: false }
        }
      ]
    }
  ],
  category: { type: String, enum: Object.values(QUIZ_CAT), required: true, default: "other"},
  difficulty: { type: String, enum: Object.values(QUIZ_DIFFICULTY), default: "medium" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  attempts: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
      attempted_at: { type: Date, required: true},
      correct: { type: Number, required: true}
    }
  ],
  allow_multiple_correct: { type: Boolean, default: false },
  require_all_correct: { type: Boolean, default: false },
  lock_answers: { type: Boolean, default: false },
  req_to_pass: {type: Number, required: true},
  created_at: {type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = Quiz;
