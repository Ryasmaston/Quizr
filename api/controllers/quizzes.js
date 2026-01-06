const Quiz = require("../models/quiz");
const User = require("../models/user");

async function getAllQuizzes(req, res) {
  try{
    const quizzes = await Quiz.find().populate("created_by", "username");
    res.status(200).json({ quizzes: quizzes })
  } catch (error) {
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
    const quiz = await Quiz.findById(req.params.id).populate("created_by", "username");
    if(!quiz){
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ quiz: quiz })
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz", error: error.message})
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
//In this method the frontend sends here an array of the user's answer choices
//so req.body.answers will look something like this ["2", "4"] if this was done on a maths quiz and the choices were numbers.
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
      const correctAnswerId = question.answers.find(
        (answer) => answer.is_correct
      )?._id?.toString();

      if (answers[index] === correctAnswerId) {
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
  deleteQuiz: deleteQuiz,
  submitQuiz: submitQuiz
};

module.exports = QuizzesController;
