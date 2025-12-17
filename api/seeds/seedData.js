const mongoose = require('mongoose');
const Quiz = require("../models/quiz");
const {connectToDatabase} = require("../db/db")
require("dotenv").config();

const seed = async () => {
  try{
    await connectToDatabase();
    console.log("Connected to MongoDB succrssfully")

    await Quiz.deleteMany({});

    const quizId1 = new mongoose.Types.ObjectId();
    const quizId2 = new mongoose.Types.ObjectId();
    const quizId3 = new mongoose.Types.ObjectId();

    const quizzes = [
      {
        _id: quizId1,
        title: "Quiz 1",
        questions: [
          {
            text: "1 + 1 = ?",
            answers: [
              { text: "1", is_correct: false },
              { text: "2", is_correct: true },
              { text: "3", is_correct: false },
              { text: "4", is_correct: false },
            ]
          },
          {
            text: "2 * 2 = ?",
            answers: [
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ]
          }
        ]
      },
      {
        _id: quizId2,
        title: "Quiz 2",
        questions: [
          {
            text: "1 + 1 = ?",
            answers: [
              { text: "1", is_correct: false },
              { text: "2", is_correct: true },
              { text: "3", is_correct: false },
              { text: "4", is_correct: false },
            ]
          },
          {
            text: "2 * 2 = ?",
            answers: [
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ]
          }
        ]
      },
      {
        _id: quizId3,
        title: "Quiz 3",
        questions: [
          {
            text: "1 + 1 = ?",
            answers: [
              { text: "1", is_correct: false },
              { text: "2", is_correct: true },
              { text: "3", is_correct: false },
              { text: "4", is_correct: false },
            ]
          },
          {
            text: "2 * 2 = ?",
            answers: [
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ]
          }
        ]
      }
    ]
    await Quiz.insertMany(quizzes);
    console.log("Seed quizzes created")
    process.exit(0);
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

seed()
