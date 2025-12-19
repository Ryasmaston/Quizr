const mongoose = require("mongoose");

const QUIZ_CAT = Object.freeze({
  ART: 'art',
  HISTORY: 'history',
  MUSIC: 'music',
  SCIENCE: 'science',
  OTHER: 'other',
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [
    {
      question_id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      text: { type: String },
      answers: [
        {
          text: { type: String, required: true },
          is_correct: { type: Boolean, default: false }
        }
      ]
    }
  ],
  category: { type: String, enum: Object.values(QUIZ_CAT), required: true },
  created_at: { type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = Quiz;
