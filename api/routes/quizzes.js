const express = require("express");
const router = express.Router();

const QuizzesController = require("../controllers/quiz");

router.get("/", QuizzesController.getAllQuizzes);
router.post("/", QuizzesController.createQuiz);

module.exports = router;
