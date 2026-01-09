require("../mongodb_helper");
const Quiz = require("../../models/quiz");
const User = require("../../models/user");
const mongoose = require("mongoose");

describe("Quiz model", () => {
  let testUser;

  beforeEach(async () => {
    await Quiz.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@test.com",
    });
  });

  afterAll(async () => {
    await Quiz.deleteMany({});
    await User.deleteMany({});
  });

  it("has a title", () => {
    const quiz = new Quiz({
      title: "Test title",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
    });
    expect(quiz.title).toEqual("Test title");
  });

  it("has a category with default value", () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      req_to_pass: 1,
    });
    expect(quiz.category).toEqual("other");
  });

  it("accepts valid category values", () => {
    const categories = ["art", "history", "music", "science", "other"];
    categories.forEach((cat) => {
      const quiz = new Quiz({
        title: "Test quiz",
        created_by: testUser._id,
        category: cat,
        req_to_pass: 1,
      });
      expect(quiz.category).toEqual(cat);
    });
  });

  it("has embedded questions with answers", () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "science",
      req_to_pass: 2,
      questions: [
        {
          text: "1 + 1 = ?",
          answers: [
            { text: "1", is_correct: false },
            { text: "2", is_correct: true },
            { text: "3", is_correct: false },
            { text: "4", is_correct: false },
          ],
        },
        {
          text: "2 * 2 = ?",
          answers: [
            { text: "3", is_correct: false },
            { text: "4", is_correct: true },
            { text: "5", is_correct: false },
            { text: "6", is_correct: false },
          ],
        },
      ],
    });
    expect(quiz.questions.length).toEqual(2);
    expect(quiz.questions[0].answers.length).toEqual(4);
    expect(quiz.questions[0].answers[0].is_correct).toEqual(false);
    expect(quiz.questions[0].answers[1].is_correct).toEqual(true);
  });

  it("auto-generates question_id and answer_id", () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
      questions: [
        {
          text: "Test question",
          answers: [{ text: "Answer 1", is_correct: true }],
        },
      ],
    });
    expect(quiz.questions[0].question_id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(quiz.questions[0].answers[0].answer_id).toBeInstanceOf(
      mongoose.Types.ObjectId
    );
  });

  it("has req_to_pass field", () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 5,
    });
    expect(quiz.req_to_pass).toEqual(5);
  });

  it("has allow_multiple_correct field with default false", () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
    });
    expect(quiz.allow_multiple_correct).toEqual(false);
  });

  it("has require_all_correct field with default false", () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
    });
    expect(quiz.require_all_correct).toEqual(false);
  });

  it("can list all quizzes", async () => {
    const quizzes = await Quiz.find();
    expect(quizzes).toEqual([]);
  });

  it("can save a quiz", async () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "history",
      req_to_pass: 1,
      questions: [
        {
          text: "1 + 1 = ?",
          answers: [
            { text: "1", is_correct: false },
            { text: "2", is_correct: true },
            { text: "3", is_correct: false },
            { text: "4", is_correct: false },
          ],
        },
      ],
    });

    await quiz.save();
    const quizzes = await Quiz.find();
    expect(quizzes.length).toEqual(1);
    expect(quizzes[0].title).toEqual("Test quiz");
    expect(quizzes[0].category).toEqual("history");
    expect(quizzes[0].req_to_pass).toEqual(1);
    expect(quizzes[0].questions[0].text).toEqual("1 + 1 = ?");
    expect(quizzes[0].questions[0].answers[0].is_correct).toEqual(false);
    expect(quizzes[0].questions[0].answers[1].is_correct).toEqual(true);
  });

  it("populates created_by field correctly", async () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "art",
      req_to_pass: 1,
      questions: [
        {
          text: "Test question",
          answers: [{ text: "Answer", is_correct: true }],
        },
      ],
    });

    await quiz.save();
    const savedQuiz = await Quiz.findById(quiz._id).populate("created_by");
    expect(savedQuiz.created_by.username).toEqual("testuser");
    expect(savedQuiz.created_by.email).toEqual("test@test.com");
  });

  it("can store quiz attempts", async () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
      attempts: [
        {
          user_id: testUser._id,
          attempted_at: new Date(),
          correct: 5,
        },
      ],
    });

    await quiz.save();
    const savedQuiz = await Quiz.findById(quiz._id);
    expect(savedQuiz.attempts.length).toEqual(1);
    expect(savedQuiz.attempts[0].correct).toEqual(5);
  });

  it("can add multiple attempts to a quiz", async () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
    });
    await quiz.save();
    quiz.attempts.push({
      user_id: testUser._id,
      attempted_at: new Date(),
      correct: 3,
    });
    quiz.attempts.push({
      user_id: testUser._id,
      attempted_at: new Date(),
      correct: 4,
    });
    await quiz.save();
    const updatedQuiz = await Quiz.findById(quiz._id);
    expect(updatedQuiz.attempts.length).toEqual(2);
    expect(updatedQuiz.attempts[0].correct).toEqual(3);
    expect(updatedQuiz.attempts[1].correct).toEqual(4);
  });

  it("can delete a quiz", async () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "music",
      req_to_pass: 1,
      questions: [
        {
          text: "1 + 1 = ?",
          answers: [
            { text: "1", is_correct: false },
            { text: "2", is_correct: true },
            { text: "3", is_correct: false },
            { text: "4", is_correct: false },
          ],
        },
      ],
    });
    await quiz.save();
    let quizzes = await Quiz.find();
    expect(quizzes.length).toEqual(1);
    await Quiz.findByIdAndDelete(quizzes[0]._id);
    quizzes = await Quiz.find();
    expect(quizzes.length).toEqual(0);
  });

  it("has a created_at timestamp", async () => {
    const quiz = new Quiz({
      title: "Test quiz",
      created_by: testUser._id,
      category: "other",
      req_to_pass: 1,
    });
    await quiz.save();
    expect(quiz.created_at).toBeInstanceOf(Date);
  });
});
