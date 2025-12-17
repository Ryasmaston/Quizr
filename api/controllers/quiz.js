const Quiz = require("../models/quiz");

async function getAllQuizzes(req, res) {
  try{
    const quizzes = await Quiz.find();
    res.status(200).json({ quizzes: quizzes })
  } catch (error) {
    res.status(500).json({ message: "Error fetching quizzes", error: error.message})
  }
}

async function createQuiz(req, res) {
  try{
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(200).json({ message: "Quiz created", quiz: quiz })
  } catch (error) {
    res.status(500).json({ message: "Error creating quiz", error: error.message})
  }
}

async function getQuizById(req, res) {
  try{
    const quiz = await Quiz.findById(req.params.id);
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

const QuizzesController = {
  getAllQuizzes: getAllQuizzes,
  createQuiz: createQuiz,
  getQuizById: getQuizById,
  deleteQuiz: deleteQuiz
};

module.exports = QuizzesController
