const express = require("express");
const router = express.Router();

const QuizzesController = require("../controllers/quizzes");

router.get("/", QuizzesController.getAllQuizzes);
router.get("/:id", QuizzesController.getQuizById);
router.post("/", QuizzesController.createQuiz);
router.delete("/:id", QuizzesController.deleteQuiz)
router.post("/:id/submit", QuizzesController.submitQuiz);

module.exports = router;
