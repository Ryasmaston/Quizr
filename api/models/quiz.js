const mongoose = require("mongoose");

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
  created_at: { type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = Quiz;
