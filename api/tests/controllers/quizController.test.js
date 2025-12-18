const request = require("supertest");
const express = require("express");
const Quiz = require("../../models/quiz");
const quizController = require("../../controllers/quiz");

jest.mock("../../models/quiz");

const app = express();
app.use(express.json());
app.post("/api/quizzes/:id/submit", quizController.submitQuiz);

describe("submitQuiz – Quiz 1 scoring", () => {

beforeEach(() => {
    jest.clearAllMocks();
});

test("returns 100% when all answers are correct", async () => {
    Quiz.findById.mockResolvedValue({
    _id: "quizId1",
    questions: [
        {
        text: "1 + 1 = ?",
        answers: [
            { text: "1", is_correct: false },
            { text: "2", is_correct: true },
            { text: "3", is_correct: false },
            { text: "4", is_correct: false }
        ]
        },
        {
          text: "2 * 2 = ?",
        answers: [
            { text: "3", is_correct: false },
            { text: "4", is_correct: true },
            { text: "5", is_correct: false },
            { text: "6", is_correct: false }
        ]
        }
    ]
    });

    const res = await request(app)
    .post("/api/quizzes/quizId1/submit")
    .send({ answers: ["2", "4"] });

    expect(res.body.correctAnswers).toBe(2);
    expect(res.body.scorePercentage).toBe("100%");
});

test("returns 50% when one answer is correct", async () => {
    Quiz.findById.mockResolvedValue({
    _id: "quizId1",
    questions: [
        {
        text: "1 + 1 = ?",
        answers: [
            { text: "1", is_correct: false },
            { text: "2", is_correct: true },
            { text: "3", is_correct: false },
            { text: "4", is_correct: false }
        ]
        },
        {
          text: "2 * 2 = ?",
        answers: [
            { text: "3", is_correct: false },
            { text: "4", is_correct: true },
            { text: "5", is_correct: false },
            { text: "6", is_correct: false }
        ]
        }
    ]
    });

    const res = await request(app)
    .post("/api/quizzes/quizId1/submit")
    .send({ answers: ["2", "3"] });

    expect(res.body.correctAnswers).toBe(1);
    expect(res.body.scorePercentage).toBe("50%");
});

test("returns 0% when all answers are incorrect", async () => {
    Quiz.findById.mockResolvedValue({
    _id: "quizId1",
    questions: [
        {
        text: "1 + 1 = ?",
        answers: [
            { text: "1", is_correct: false },
            { text: "2", is_correct: true },
            { text: "3", is_correct: false },
            { text: "4", is_correct: false }
        ]
        },
        {
          text: "2 * 2 = ?",
        answers: [
            { text: "3", is_correct: false },
            { text: "4", is_correct: true },
            { text: "5", is_correct: false },
            { text: "6", is_correct: false }
        ]
        }
    ]
    });

    const res = await request(app)
    .post("/api/quizzes/quizId1/submit")
    .send({ answers: ["1", "3"] });

    expect(res.body.correctAnswers).toBe(0);
    expect(res.body.scorePercentage).toBe("0%");
});

});
