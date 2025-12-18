const express = require("express");
const router = express.Router();

const QuizzesController = require("../controllers/quiz");

router.get("/", QuizzesController.getAllQuizzes);
router.get("/:id", QuizzesController.getQuizById);
router.post("/", QuizzesController.createQuiz);
router.post("/:id/submit", QuizzesController.submitQuiz);

module.exports = router;
