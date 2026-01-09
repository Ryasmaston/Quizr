const request = require("supertest");
const User = require("../../models/user");
const Quiz = require("../../models/quiz");
require("../mongodb_helper");

jest.mock("../../middleware/requireAuth", () => (req, res, next) => {
  req.user = {
    uid: "test-auth-id",
    email: "test@email.com"
  };
  next();
});

const app = require("../../app");

describe("/quizzes", () => {
  let testUser;
  beforeEach(async () => {
    await Quiz.deleteMany({});
    await User.deleteMany({});
    testUser = new User({
      username: "testuser",
      email: "test@email.com",
      authId: "test-auth-id"
    });
    await testUser.save();
  });

  describe("GET /quizzes", () => {
    test("returns an empty array when there are no quizzes", async () => {
      const response = await request(app).get("/quizzes");
      expect(response.status).toEqual(200);
      expect(response.body.quizzes).toEqual([]);
    });
    test("returns all quizzes with creator information", async () => {
      const quiz1 = new Quiz({
        title: "Test Quiz 1",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: []
      });
      await quiz1.save();
      const quiz2 = new Quiz({
        title: "Test Quiz 2",
        category: "history",
        created_by: testUser._id,
        req_to_pass: 80,
        questions: []
      });
      await quiz2.save();
      const response = await request(app).get("/quizzes");
      expect(response.status).toEqual(200);
      expect(response.body.quizzes).toHaveLength(2);
      expect(response.body.quizzes[0].created_by.username).toEqual("testuser");
    });
    test("filters quizzes by created_by query parameter", async () => {
      const otherUser = new User({
        username: "otheruser",
        email: "other@email.com",
        authId: "other-auth-id"
      });
      await otherUser.save();
      const quiz1 = new Quiz({
        title: "Test Quiz 1",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: []
      });
      await quiz1.save();
      const quiz2 = new Quiz({
        title: "Test Quiz 2",
        category: "history",
        created_by: otherUser._id,
        req_to_pass: 80,
        questions: []
      });
      await quiz2.save();
      const response = await request(app)
        .get("/quizzes")
        .query({ created_by: testUser._id.toString() });
      expect(response.status).toEqual(200);
      expect(response.body.quizzes).toHaveLength(1);
      expect(response.body.quizzes[0].title).toEqual("Test Quiz 1");
    });
  });

  describe("POST /quizzes", () => {
    test("returns status 200 when quiz is created", async () => {
      const response = await request(app)
        .post("/quizzes")
        .send({
          title: "Test title",
          category: "science",
          req_to_pass: 70,
          questions: []
        });
      expect(response.status).toEqual(200);
      expect(response.body.message).toEqual("Quiz created");
    });
    test("creates and adds a quiz to the database", async () => {
      await request(app)
        .post("/quizzes")
        .send({
          title: "Test title",
          category: "art",
          req_to_pass: 75,
          questions: []
        });
      const quizzes = await Quiz.find();
      expect(quizzes.length).toEqual(1);
      expect(quizzes[0].title).toEqual("Test title");
      expect(quizzes[0].category).toEqual("art");
      expect(quizzes[0].req_to_pass).toEqual(75);
      expect(quizzes[0].created_by.toString()).toEqual(testUser._id.toString());
    });

    test("creates a quiz with questions and answers", async () => {
      await request(app)
        .post("/quizzes")
        .send({
          title: "Test title",
          category: "history",
          req_to_pass: 60,
          questions: [
            {
              text: "What is the capital of France?",
              answers: [
                { text: "Paris", is_correct: true },
                { text: "London", is_correct: false },
                { text: "Berlin", is_correct: false }
              ]
            }
          ]
        });
      const quizzes = await Quiz.find();
      expect(quizzes.length).toEqual(1);
      expect(quizzes[0].title).toEqual("Test title");
      expect(quizzes[0].questions.length).toEqual(1);
      expect(quizzes[0].questions[0].text).toEqual("What is the capital of France?");
      expect(quizzes[0].questions[0].answers.length).toEqual(3);
      expect(quizzes[0].questions[0].answers[0].text).toEqual("Paris");
      expect(quizzes[0].questions[0].answers[0].is_correct).toEqual(true);
      expect(quizzes[0].questions[0].answers[1].text).toEqual("London");
      expect(quizzes[0].questions[0].answers[1].is_correct).toEqual(false);
      expect(quizzes[0].questions[0].answers[2].text).toEqual("Berlin");
      expect(quizzes[0].questions[0].answers[2].is_correct).toEqual(false);
    });

    test("returns 404 when user is not found", async () => {
      await User.deleteMany({});
      const response = await request(app)
        .post("/quizzes")
        .send({
          title: "Test title",
          category: "science",
          req_to_pass: 70,
          questions: []
        });
      expect(response.status).toEqual(404);
      expect(response.body.message).toEqual("User not found");
    });
    test("creates quiz with allow_multiple_correct and require_all_correct flags", async () => {
      await request(app)
        .post("/quizzes")
        .send({
          title: "Multi-select Quiz",
          category: "music",
          req_to_pass: 80,
          allow_multiple_correct: true,
          require_all_correct: true,
          questions: []
        });
      const quizzes = await Quiz.find();
      expect(quizzes[0].allow_multiple_correct).toEqual(true);
      expect(quizzes[0].require_all_correct).toEqual(true);
    });
  });

  describe("GET /quizzes/:id", () => {
    test("returns a quiz when it exists", async () => {
      const quiz = new Quiz({
        title: "Test quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: []
      });
      await quiz.save();
      const response = await request(app).get(`/api/quizzes/${quiz._id}`);
      expect(response.status).toEqual(200);
      expect(response.body.quiz.title).toEqual("Test quiz");
      expect(response.body.quiz.created_by.username).toEqual("testuser");
    });
    test("returns quiz with populated attempts", async () => {
      const quiz = new Quiz({
        title: "Test quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: [],
        attempts: [{
          user_id: testUser._id,
          attempted_at: new Date(),
          correct: 5
        }]
      });
      await quiz.save();
      const response = await request(app).get(`/quizzes/${quiz._id}`);
      expect(response.status).toEqual(200);
      expect(response.body.quiz.attempts).toHaveLength(1);
      expect(response.body.quiz.attempts[0].user_id.username).toEqual("testuser");
    });
    test("returns 404 when quiz does not exist", async () => {
      const response = await request(app).get("/quizzes/507f1f77bcf86cd799439011");
      expect(response.status).toEqual(404);
      expect(response.body.message).toEqual("Quiz not found");
    });
  });

  describe("GET /quizzes/leaderboard", () => {
    test("returns an empty leaderboard when no attempts exist", async () => {
      const response = await request(app).get("/quizzes/leaderboard");
      expect(response.status).toEqual(200);
      expect(response.body.leaderboard).toEqual([]);
    });
    test("returns leaderboard with user statistics", async () => {
      const quiz = new Quiz({
        title: "Test quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: [
          {
            text: "Question 1",
            answers: [{ text: "Answer 1", is_correct: true }]
          },
          {
            text: "Question 2",
            answers: [{ text: "Answer 2", is_correct: true }]
          }
        ],
        attempts: [
          {
            user_id: testUser._id,
            attempted_at: new Date(),
            correct: 2
          }
        ]
      });
      await quiz.save();
      const response = await request(app).get("/quizzes/leaderboard");
      expect(response.status).toEqual(200);
      expect(response.body.leaderboard).toHaveLength(1);
      expect(response.body.leaderboard[0].username).toEqual("testuser");
      expect(response.body.leaderboard[0].totalCorrect).toEqual(2);
      expect(response.body.leaderboard[0].attemptsCount).toEqual(1);
      expect(response.body.leaderboard[0].quizzesTaken).toEqual(1);
    });
    test("calculates avgPercent and bestPercent correctly", async () => {
      const quiz = new Quiz({
        title: "Test quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: [
          { text: "Q1", answers: [{ text: "A1", is_correct: true }] },
          { text: "Q2", answers: [{ text: "A2", is_correct: true }] }
        ],
        attempts: [
          {
            user_id: testUser._id,
            attempted_at: new Date(),
            correct: 2
          },
          {
            user_id: testUser._id,
            attempted_at: new Date(),
            correct: 1
          }
        ]
      });
      await quiz.save();
      const response = await request(app).get("/quizzes/leaderboard");
      expect(response.status).toEqual(200);
      expect(response.body.leaderboard[0].bestPercent).toEqual(100);
      expect(response.body.leaderboard[0].avgPercent).toEqual(75);
    });
  });

  describe("DELETE /quizzes/:id", () => {
    test("deletes a quiz when it exists", async () => {
      const quiz = new Quiz({
        title: "Test quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: []
      });
      await quiz.save();
      const response = await request(app).delete(`/api/quizzes/${quiz._id}`);
      expect(response.status).toEqual(200);
      expect(response.body.message).toEqual("Quiz deleted");
      const deletedQuiz = await Quiz.findById(quiz._id);
      expect(deletedQuiz).toBeNull();
    });
    test("returns 200 with message when quiz does not exist", async () => {
      const response = await request(app).delete("/quizzes/507f1f77bcf86cd799439011");
      expect(response.status).toEqual(200);
      expect(response.body.message).toEqual("Quiz not found");
    });
  });

  describe("POST /quizzes/:id/submit", () => {
    let quiz;
    beforeEach(async () => {
      quiz = new Quiz({
        title: "Test Quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        questions: [
          {
            text: "What is 2+2?",
            answers: [
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false }
            ]
          },
          {
            text: "What is the capital of France?",
            answers: [
              { text: "London", is_correct: false },
              { text: "Paris", is_correct: true },
              { text: "Berlin", is_correct: false }
            ]
          }
        ]
      });
      await quiz.save();
    });
    test("returns 404 when quiz does not exist", async () => {
      const response = await request(app)
        .post("/quizzes/507f1f77bcf86cd799439011/submit")
        .send({ answers: [] });

      expect(response.status).toEqual(404);
      expect(response.body.message).toEqual("Quiz not found");
    });
    test("calculates score correctly for all correct answers", async () => {
      const correctAnswer1 = quiz.questions[0].answers.find(a => a.is_correct)._id;
      const correctAnswer2 = quiz.questions[1].answers.find(a => a.is_correct)._id;
      const response = await request(app)
        .post(`/quizzes/${quiz._id}/submit`)
        .send({
          answers: [correctAnswer1.toString(), correctAnswer2.toString()]
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("100%");
      expect(response.body.correctAnswers).toEqual(2);
    });
    test("calculates score correctly for partial correct answers", async () => {
      const correctAnswer1 = quiz.questions[0].answers.find(a => a.is_correct)._id;
      const incorrectAnswer2 = quiz.questions[1].answers.find(a => !a.is_correct)._id;
      const response = await request(app)
        .post(`/quizzes/${quiz._id}/submit`)
        .send({
          answers: [correctAnswer1.toString(), incorrectAnswer2.toString()]
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("50%");
      expect(response.body.correctAnswers).toEqual(1);
    });
    test("calculates score as 0 for all incorrect answers", async () => {
      const incorrectAnswer1 = quiz.questions[0].answers.find(a => !a.is_correct)._id;
      const incorrectAnswer2 = quiz.questions[1].answers.find(a => !a.is_correct)._id;
      const response = await request(app)
        .post(`/quizzes/${quiz._id}/submit`)
        .send({
          answers: [incorrectAnswer1.toString(), incorrectAnswer2.toString()]
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("0%");
      expect(response.body.correctAnswers).toEqual(0);
    });
    test("saves attempt to quiz attempts array", async () => {
      const correctAnswer1 = quiz.questions[0].answers.find(a => a.is_correct)._id;
      const correctAnswer2 = quiz.questions[1].answers.find(a => a.is_correct)._id;
      await request(app)
        .post(`/quizzes/${quiz._id}/submit`)
        .send({
          answers: [correctAnswer1.toString(), correctAnswer2.toString()]
        });
      const updatedQuiz = await Quiz.findById(quiz._id);
      expect(updatedQuiz.attempts).toHaveLength(1);
      expect(updatedQuiz.attempts[0].user_id.toString()).toEqual(testUser._id.toString());
      expect(updatedQuiz.attempts[0].correct).toEqual(2);
      expect(updatedQuiz.attempts[0].attempted_at).toBeDefined();
    });
    test("handles multiple choice questions with require_all_correct", async () => {
      const multiChoiceQuiz = new Quiz({
        title: "Multi Choice Quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        require_all_correct: true,
        questions: [
          {
            text: "Select all prime numbers",
            answers: [
              { text: "2", is_correct: true },
              { text: "3", is_correct: true },
              { text: "4", is_correct: false },
              { text: "5", is_correct: true }
            ]
          }
        ]
      });
      await multiChoiceQuiz.save();
      const correctAnswers = multiChoiceQuiz.questions[0].answers
        .filter(a => a.is_correct)
        .map(a => a._id.toString());
      const response = await request(app)
        .post(`/quizzes/${multiChoiceQuiz._id}/submit`)
        .send({
          answers: [correctAnswers]
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("100%");
      expect(response.body.correctAnswers).toEqual(1);
    });
    test("marks question wrong if not all correct answers selected with require_all_correct", async () => {
      const multiChoiceQuiz = new Quiz({
        title: "Multi Choice Quiz",
        category: "science",
        created_by: testUser._id,
        req_to_pass: 70,
        require_all_correct: true,
        questions: [
          {
            text: "Select all prime numbers",
            answers: [
              { text: "2", is_correct: true },
              { text: "3", is_correct: true },
              { text: "4", is_correct: false }
            ]
          }
        ]
      });
      await multiChoiceQuiz.save();
      const partialAnswer = [multiChoiceQuiz.questions[0].answers[0]._id.toString()];
      const response = await request(app)
        .post(`/quizzes/${multiChoiceQuiz._id}/submit`)
        .send({
          answers: [partialAnswer]
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("0%");
      expect(response.body.correctAnswers).toEqual(0);
    });
    test("handles empty answer submissions", async () => {
      const response = await request(app)
        .post(`/quizzes/${quiz._id}/submit`)
        .send({
          answers: []
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("0%");
      expect(response.body.correctAnswers).toEqual(0);
    });
    test("ignores questions with no selection", async () => {
      const correctAnswer1 = quiz.questions[0].answers.find(a => a.is_correct)._id;
      const response = await request(app)
        .post(`/quizzes/${quiz._id}/submit`)
        .send({
          answers: [correctAnswer1.toString(), null]
        });
      expect(response.status).toEqual(200);
      expect(response.body.scorePercentage).toEqual("50%");
      expect(response.body.correctAnswers).toEqual(1);
    });
  });
});
