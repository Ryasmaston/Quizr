const request = require("supertest")
const app = require("../../app");
const Quiz = require("../../models/quiz");
require("../mongodb_helper");

describe("/quizzes", () => {
  beforeEach(async () => {
    await Quiz.deleteMany({})
  })

  describe("GET /quizzes", () => {
    it("returns an empty array when there are no quizzes", async () => {
      const response = await request(app).get("/quizzes");
      expect(response.status).toEqual(200);
      expect(response.body.quizzes).toEqual([]);
    });
  })
  describe("POST /quizzes", () => {
    it("returns status 200 when quiz is created", async () => {
      const response = await request(app)
        .post("/quizzes")
        .send({
          title: "Test title"
        });
      expect(response.status).toEqual(200);
      expect(response.body.message).toEqual("Quiz created")
    })
    it("creates and adds a quiz to the database", async () => {
      await request(app)
        .post("/quizzes")
        .send({
          title: "Test title"
        })
      const quizzes = await Quiz.find();
      expect(quizzes.length).toEqual(1);
      expect(quizzes[0].title).toEqual("Test title")
    })
    it("creates a quiz with questions and answers", async () => {
      await request(app)
        .post("/quizzes")
        .send({
          title: "Test title",
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
        })
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
    })
  })

  describe("GET /quizzes/:id", () => {
    it("returns a quiz when it exists", async () => {
      const quiz = new Quiz({
        title: "Test quiz"
      })
      await quiz.save();
      const response = await request(app).get(`/quizzes/${quiz._id}`);
      expect(response.status).toEqual(200);
      expect(response.body.quiz.title).toEqual("Test quiz");
    })
    it("returns 404 when quiz does not exist", async () => {
      const response = await request(app).get("/quizzes/507f1f77bcf86cd799439011")
      expect(response.status).toEqual(404)
      expect(response.body.message).toEqual("Quiz not found")
    });
  })
  describe("DELETE /quizzes/:id", () => {
    it("deletes a quiz when it exists", async () => {
      const quiz = new Quiz({
        title: "Test quiz"
      })
      await quiz.save();
      const response = await request(app).delete(`/quizzes/${quiz._id}`);
      expect(response.status).toEqual(200);
      expect(response.body.message).toEqual("Quiz deleted");
    })
    it("returns 404 when quiz does not exist", async () => {
      const response = await request(app).delete("/quizzes/507f1f77bcf86cd799439011")
      expect(response.status).toEqual(200)
      expect(response.body.message).toEqual("Quiz not found")
    });
  })
})
