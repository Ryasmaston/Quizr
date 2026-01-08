const Quiz = require("../models/quiz");
const User = require("../models/user");


async function getAllQuizzes(req, res) {
  try{
    const { created_by } = req.query;
    let filter = {};
    if (created_by) {
      filter.created_by = created_by;
    }
    const quizzes = await Quiz.find(filter).populate("created_by", "username");
    res.status(200).json({ quizzes: quizzes })
  } catch (error) {
    console.error("Error in getAllQuizzes:", error);  // Add this to see the error
    res.status(500).json({ message: "Error fetching quizzes", error: error.message})
  }
}

async function createQuiz(req, res) {
  try{
    const user = await User.findOne({ authId: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const quiz = new Quiz({ ...req.body, created_by: user._id });
    await quiz.save();
    res.status(200).json({ message: "Quiz created", quiz: quiz })
  } catch (error) {
    res.status(500).json({ message: "Error creating quiz", error: error.message})
  }
}

async function getQuizById(req, res) {
  try{
    const quiz = await Quiz.findById(req.params.id)
      .populate("created_by", "username")
      .populate("attempts.user_id", "username");
    if(!quiz){
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ quiz: quiz })
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz", error: error.message})
  }
}

async function getLeaderboard(req, res) {
  try {
    const leaderboard = await Quiz.aggregate([
      { $unwind: "$attempts" },
      {
        $project: {
          user_id: "$attempts.user_id",
          correct: "$attempts.correct",
          totalQuestions: { $size: "$questions" },
          quiz_id: "$_id"
        }
      },
      {
        $group: {
          _id: "$user_id",
          totalCorrect: { $sum: "$correct" },
          totalQuestions: { $sum: "$totalQuestions" },
          attemptsCount: { $sum: 1 },
          bestPercent: {
            $max: {
              $cond: [
                { $gt: ["$totalQuestions", 0] },
                { $multiply: [{ $divide: ["$correct", "$totalQuestions"] }, 100] },
                0
              ]
            }
          },
          quizzes: { $addToSet: "$quiz_id" }
        }
      },
      {
        $project: {
          user_id: "$_id",
          totalCorrect: 1,
          totalQuestions: 1,
          attemptsCount: 1,
          bestPercent: 1,
          quizzesTaken: { $size: "$quizzes" },
          avgPercent: {
            $cond: [
              { $gt: ["$totalQuestions", 0] },
              { $multiply: [{ $divide: ["$totalCorrect", "$totalQuestions"] }, 100] },
              0
            ]
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "quizzes",
          let: { userId: "$user_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$created_by", "$$userId"] } } },
            { $count: "count" }
          ],
          as: "createdQuizzes"
        }
      },
      {
        $project: {
          user_id: 1,
          username: "$user.username",
          totalCorrect: 1,
          totalQuestions: 1,
          attemptsCount: 1,
          quizzesTaken: 1,
          quizzesCreated: {
            $ifNull: [{ $arrayElemAt: ["$createdQuizzes.count", 0] }, 0]
          },
          bestPercent: 1,
          avgPercent: 1
        }
      }
    ]);

    res.status(200).json({ leaderboard: leaderboard });
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard", error: error.message });
  }
}

async function deleteQuiz(req, res) {
  try{
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if(!quiz) {
      return res.status(200).json({ message: "Quiz not found" });
    }
    res.status(200).json({ message: "Quiz deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting quiz", error: error.message})
  }
}
// In this method the frontend sends an array of answer selections per question.
// Each entry can be a string (single select) or an array of answer ids (multi select).
async function submitQuiz(req, res) {
  try {
    const { answers } = req.body; // Here we get the user's answers from the request body
    const quiz = await Quiz.findById(req.params.id); // Here we find the quiz by ID

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" }); // Error handle for no quiz found
    }

    let score = 0;

    // Here we compare the user's answers to the correct ones from the seedData
    quiz.questions.forEach((question, index) => {
      const correctAnswerIds = question.answers
        .filter((answer) => answer.is_correct)
        .map((answer) => answer._id?.toString())
        .filter(Boolean);

      const correctSet = new Set(correctAnswerIds);
      const selection = answers?.[index];
      const selectedIds = Array.isArray(selection)
        ? selection
        : selection
        ? [selection]
        : [];
      const selectedSet = new Set(selectedIds.map((id) => id?.toString()).filter(Boolean));

      if (selectedSet.size === 0) return;

      const hasIncorrect = Array.from(selectedSet).some((id) => !correctSet.has(id));
      if (hasIncorrect) return;

      if (quiz.require_all_correct) {
        if (correctSet.size > 0 && selectedSet.size === correctSet.size) {
          score++;
        }
        return;
      }

      const hasCorrect = Array.from(selectedSet).some((id) => correctSet.has(id));
      if (hasCorrect) {
        score++;
      }
    });

    const scorePercentage = (score / quiz.questions.length) * 100; // Percentage

    const user = await User.findOne({ authId: req.user.uid });
    if (user) {
      quiz.attempts.push({
        user_id: user._id,
        attempted_at: new Date(),
        correct: score
      });
      await quiz.save();
    }

    res.status(200).json({
      scorePercentage: `${scorePercentage}%`,
      correctAnswers: score
    }); // Returning the amount of correct answers user got
  } catch (error) {
    res.status(500).json({
      message: "Error submitting quiz",
      error: error.message
    });
  }
}

const QuizzesController = {
  getAllQuizzes: getAllQuizzes,
  createQuiz: createQuiz,
  getQuizById: getQuizById,
  getLeaderboard: getLeaderboard,
  deleteQuiz: deleteQuiz,
  submitQuiz: submitQuiz
};

module.exports = QuizzesController;
