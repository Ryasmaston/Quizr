const Quiz = require("../models/quiz");
const User = require("../models/user");

function normalizeText(value) {
  return value == null ? "" : String(value);
}

function shouldResetAttempts(originalQuiz, updatedData) {
  const originalQuestions = Array.isArray(originalQuiz?.questions)
    ? originalQuiz.questions
    : [];
  const updatedQuestions = Array.isArray(updatedData?.questions)
    ? updatedData.questions
    : [];

  if (originalQuestions.length !== updatedQuestions.length) return true;

  for (let i = 0; i < originalQuestions.length; i += 1) {
    const originalQuestion = originalQuestions[i];
    const updatedQuestion = updatedQuestions[i];
    if (!updatedQuestion) return true;

    if (normalizeText(originalQuestion?.text) !== normalizeText(updatedQuestion?.text)) {
      return true;
    }

    const originalAnswers = Array.isArray(originalQuestion?.answers)
      ? originalQuestion.answers
      : [];
    const updatedAnswers = Array.isArray(updatedQuestion?.answers)
      ? updatedQuestion.answers
      : [];
    const sharedCount = Math.min(originalAnswers.length, updatedAnswers.length);

    for (let j = 0; j < sharedCount; j += 1) {
      if (normalizeText(originalAnswers[j]?.text) !== normalizeText(updatedAnswers[j]?.text)) {
        return true;
      }
    }

    const originalCorrectIndices = originalAnswers
      .map((answer, index) => (answer?.is_correct ? index : null))
      .filter((index) => index !== null);
    if (originalCorrectIndices.length > 0) {
      const remainingOriginalCorrect = originalCorrectIndices.filter(
        (index) => index < updatedAnswers.length
      );
      const hasOverlap = remainingOriginalCorrect.some(
        (index) => Boolean(updatedAnswers[index]?.is_correct)
      );
      if (!hasOverlap) {
        return true;
      }
    }
  }

  return false;
}

async function getAllQuizzes(req, res) {
  try {
    const { created_by } = req.query;
    let matchStage = {};
    if (created_by) {
      // Convert string to ObjectId for aggregation
      const mongoose = require('mongoose');
      matchStage.created_by = new mongoose.Types.ObjectId(created_by);
    }

    // Use aggregation to compute favorite counts from User collection
    const quizzes = await Quiz.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $lookup: {
          from: "users",
          let: { quizId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$$quizId", { $ifNull: ["$preferences.favourites", []] }]
                }
              }
            },
            { $count: "count" }
          ],
          as: "favoriteInfo"
        }
      },
      {
        $addFields: {
          favourited_count: {
            $ifNull: [{ $arrayElemAt: ["$favoriteInfo.count", 0] }, 0]
          }
        }
      },
      {
        $project: {
          favoriteInfo: 0
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          as: "created_by"
        }
      },
      {
        $unwind: {
          path: "$created_by",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          "created_by.user_data.username": 1,
          "created_by.authId": 1,
          "created_by._id": 1,
          title: 1,
          questions: 1,
          category: 1,
          difficulty: 1,
          attempts: 1,
          allow_multiple_correct: 1,
          require_all_correct: 1,
          lock_answers: 1,
          req_to_pass: 1,
          favourited_count: 1,
          created_at: 1
        }
      }
    ]);

    res.status(200).json({ quizzes: quizzes })
  } catch (error) {
    console.error("Error in getAllQuizzes:", error);
    res.status(500).json({ message: "Error fetching quizzes", error: error.message })
  }
}

async function createQuiz(req, res) {
  try {
    const user = await User.findOne({ authId: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const quiz = new Quiz({ ...req.body, created_by: user._id });
    await quiz.save();
    res.status(200).json({ message: "Quiz created", quiz: quiz })
  } catch (error) {
    res.status(500).json({ message: "Error creating quiz", error: error.message })
  }
}

async function updateQuiz(req, res) {
  try {
    const user = await User.findOne({ authId: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (quiz.created_by.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const resetAttempts = shouldResetAttempts(quiz, req.body);

    quiz.title = req.body.title ?? quiz.title;
    quiz.category = req.body.category ?? quiz.category;
    quiz.difficulty = req.body.difficulty ?? quiz.difficulty;
    if (Array.isArray(req.body.questions)) {
      quiz.questions = req.body.questions;
    }
    quiz.allow_multiple_correct = Boolean(req.body.allow_multiple_correct);
    quiz.require_all_correct = quiz.allow_multiple_correct
      ? Boolean(req.body.require_all_correct)
      : false;
    quiz.lock_answers = Boolean(req.body.lock_answers);
    if (typeof req.body.req_to_pass === "number") {
      quiz.req_to_pass = req.body.req_to_pass;
    }

    if (resetAttempts) {
      quiz.attempts = [];
    }

    await quiz.save();
    res.status(200).json({ message: "Quiz updated", quiz, attempts_reset: resetAttempts });
  } catch (error) {
    res.status(500).json({ message: "Error updating quiz", error: error.message });
  }
}

async function getQuizById(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate("created_by", "user_data.username authId")
      .populate("attempts.user_id", "user_data.username");
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ quiz: quiz })
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz", error: error.message })
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
        $lookup: {
          from: "quizzes",
          let: { userId: "$user_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$created_by", "$$userId"] } } },
            { $project: { attemptsCount: { $size: { $ifNull: ["$attempts", []] } } } },
            { $group: { _id: null, attemptsOnTheirQuizzes: { $sum: "$attemptsCount" } } }
          ],
          as: "createdQuizzesAttempts"
        }
      },
      {
        $project: {
          user_id: 1,
          "user_data.username": "$user.user_data.username",
          totalCorrect: 1,
          totalQuestions: 1,
          attemptsCount: 1,
          quizzesTaken: 1,
          quizzesCreated: {
            $ifNull: [{ $arrayElemAt: ["$createdQuizzes.count", 0] }, 0]
          },
          attemptsOnTheirQuizzes: {
            $ifNull: [{ $arrayElemAt: ["$createdQuizzesAttempts.attemptsOnTheirQuizzes", 0] }, 0]
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
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(200).json({ message: "Quiz not found" });
    }
    await User.updateMany(
      { "preferences.favourites": quiz._id },
      { $pull: { "preferences.favourites": quiz._id } }
    );
    res.status(200).json({ message: "Quiz deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting quiz", error: error.message })
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
  updateQuiz: updateQuiz,
  getQuizById: getQuizById,
  getLeaderboard: getLeaderboard,
  deleteQuiz: deleteQuiz,
  submitQuiz: submitQuiz
};

module.exports = QuizzesController;
