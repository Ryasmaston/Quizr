const User = require("../models/user")
const mongoose = require('mongoose');
const Quiz = require("../models/quiz");
const {connectToDatabase} = require("../db/db")
const admin = require("../lib/firebaseAdmin")
require("dotenv").config();

async function createSeedUser({ username, email, password }) {
  const firebaseUser = await admin.auth().createUser({
    email,
    password
  });
  const user = new User({
    authId: firebaseUser.uid,
    username,
    email
  });
  await user.save();
  return user;
}

async function deleteAllFirebaseUsers(nextPageToken) {
  try {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map(user => user.uid);
    if (uids.length > 0) {
      await admin.auth().deleteUsers(uids);
      console.log(`Deleted ${uids.length} users from Firebase Auth`);
    }
    if (listUsersResult.pageToken) {
      await deleteAllFirebaseUsers(listUsersResult.pageToken);
    }
  } catch (error) {
    console.error("Error deleting Firebase users:", error);
  }
}

const seed = async () => {
  try{
    await connectToDatabase();
    console.log("Connected to MongoDB successfully")

    await Quiz.deleteMany({});
    await User.deleteMany({});
    await deleteAllFirebaseUsers();

    const jane = await createSeedUser({
      username: "JaneDoe",
      email: "jane@email.com",
      password: "Password123"
    });
    const alice = await createSeedUser({
      username: "Alice",
      email: "alice@email.com",
      password: "Password123"
    })
    const barney = await createSeedUser({
      username: "Barney",
      email: "barney@email.com",
      password: "Password123"
    })
    console.log("Seed users created")

    const quizId1 = new mongoose.Types.ObjectId();
    const quizId2 = new mongoose.Types.ObjectId();
    const quizId3 = new mongoose.Types.ObjectId();

    const addAnswerIds = (items) =>
      items.map((item) => ({
        _id: new mongoose.Types.ObjectId(),
        ...item,
      }))

    const quizzes = [
      {
        _id: quizId1,
        title: "Quiz 1",
        category: "science",
        created_by: jane._id,
        questions: [
          {
            text: "1 + 1 = ?",
            answers: addAnswerIds([
              { text: "1", is_correct: false },
              { text: "2", is_correct: true },
              { text: "3", is_correct: false },
              { text: "4", is_correct: false },
            ]),
          },
          {
            text: "2 * 2 = ?",
            answers: addAnswerIds([
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ]),
          },
        ],
      },
      {
        _id: quizId2,
        title: "Quiz 2",
        category: "science",
        created_by: alice._id,
        questions: [
          {
            text: "1 + 1 = ?",
            answers: addAnswerIds([
              { text: "1", is_correct: false },
              { text: "2", is_correct: true },
              { text: "3", is_correct: false },
              { text: "4", is_correct: false },
            ]),
          },
          {
            text: "2 * 2 = ?",
            answers: addAnswerIds([
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ]),
          },
        ],
      },
      {
        _id: quizId3,
        title: "Quiz 3",
        category: "science",
        created_by: alice._id,
        questions: [
          {
            text: "1 + 1 = ?",
            answers: addAnswerIds([
              { text: "1", is_correct: false },
              { text: "2", is_correct: true },
              { text: "3", is_correct: false },
              { text: "4", is_correct: false },
            ]),
          },
          {
            text: "2 * 2 = ?",
            answers: addAnswerIds([
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ])
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
