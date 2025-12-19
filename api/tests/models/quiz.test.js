// require("../mongodb_helper");

// const Quiz = require("../../models/quiz");

// describe("Quiz model", () => {
//   beforeEach(async () => {
//     await Quiz.deleteMany({})
//   })
//   it("has a title", () => {
//     const quiz = new Quiz({ title: "Test title" });
//     expect(quiz.title).toEqual("Test title")
//   })
//   it("has embedded questions with answers", () => {
//     const quiz = new Quiz({
//       title: "Test quiz",
//       questions: [
//         {
//           text: "1 + 1 = ?",
//           answers: [
//             { text: "1", is_correct: false },
//             { text: "2", is_correct: true },
//             { text: "3", is_correct: false },
//             { text: "4", is_correct: false },
//           ]
//         },
//         {
//           text: "2 * 2 = ?",
//           answers: [
//             { text: "3", is_correct: false },
//             { text: "4", is_correct: true },
//             { text: "5", is_correct: false },
//             { text: "6", is_correct: false },
//           ]
//         }
//       ]
//     });
//     expect(quiz.questions.length).toEqual(2);
//     expect(quiz.questions[0].answers.length).toEqual(4);
//     expect(quiz.questions[0].answers[0].is_correct).toEqual(false)
//     expect(quiz.questions[0].answers[1].is_correct).toEqual(true)
//   });
//   it("can list all quizzes", async () => {
//     const quizzes = await Quiz.find();
//     expect(quizzes).toEqual([]);
//   });
//   it("can save a quiz", async () => {
//     const quiz = new Quiz({
//       title: "Test quiz",
//       questions: [
//         {
//           text: "1 + 1 = ?",
//           answers: [
//             { text: "1", is_correct: false },
//             { text: "2", is_correct: true },
//             { text: "3", is_correct: false },
//             { text: "4", is_correct: false },
//           ]
//         }
//       ]
//     });
//     await quiz.save();
//     const quizzes = await Quiz.find();
//     expect(quizzes.length).toEqual(1);
//     expect(quizzes[0].title).toEqual("Test quiz");
//     expect(quizzes[0].questions[0].text).toEqual("1 + 1 = ?")
//     expect(quizzes[0].questions[0].answers[0].is_correct).toEqual(false)
//     expect(quizzes[0].questions[0].answers[1].is_correct).toEqual(true)
//   })
//   it("can delete a quiz", async () => {
//     const quiz = new Quiz({
//       title: "Test quiz",
//       questions: [
//         {
//           text: "1 + 1 = ?",
//           answers: [
//             { text: "1", is_correct: false },
//             { text: "2", is_correct: true },
//             { text: "3", is_correct: false },
//             { text: "4", is_correct: false },
//           ]
//         }
//       ]
//     });
//     await quiz.save();
//     let quizzes = await Quiz.find();
//     expect(quizzes.length).toEqual(1);
//     await Quiz.findByIdAndDelete(quizzes[0]._id);
//     quizzes = await Quiz.find();
//     expect(quizzes.length).toEqual(0)
//   })
// })
