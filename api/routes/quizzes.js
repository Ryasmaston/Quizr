const express = require("express");
const router = express.Router();

const QuizzesController = require("../controllers/quizzes");

router.get("/", QuizzesController.getAllQuizzes);
router.post("/", QuizzesController.createQuiz);
router.get("/:id", QuizzesController.getQuizById);
router.delete("/:id", QuizzesController.deleteQuiz)

module.exports = router;
