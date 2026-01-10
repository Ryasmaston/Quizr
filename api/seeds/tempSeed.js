const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
const { connectToDatabase } = require("../db/db");
const User = require("../models/user");
const Quiz = require("../models/quiz");
const Friend = require("../models/friend");

const QUIZ_CATEGORIES = new Set(["art", "history", "music", "science", "other"]);
const QUIZ_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function loadJson(relativePath) {
  const filePath = path.join(__dirname, "..", "db", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseExtendedJson(value) {
  if (Array.isArray(value)) {
    return value.map(parseExtendedJson);
  }
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "$oid")) {
      return new mongoose.Types.ObjectId(value.$oid);
    }
    if (Object.prototype.hasOwnProperty.call(value, "$date")) {
      return new Date(value.$date);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, parseExtendedJson(val)])
    );
  }
  return value;
}

function normalizeQuiz(quiz) {
  const normalized = { ...quiz };
  const questionsCount = Array.isArray(normalized.questions)
    ? normalized.questions.length
    : 0;

  const category = typeof normalized.category === "string"
    ? normalized.category.toLowerCase()
    : "other";
  normalized.category = QUIZ_CATEGORIES.has(category) ? category : "other";

  const difficulty = typeof normalized.difficulty === "string"
    ? normalized.difficulty.toLowerCase()
    : "medium";
  normalized.difficulty = QUIZ_DIFFICULTIES.has(difficulty) ? difficulty : "medium";

  normalized.allow_multiple_correct = Boolean(normalized.allow_multiple_correct);
  normalized.require_all_correct = Boolean(normalized.require_all_correct);
  if (normalized.require_all_correct) {
    normalized.allow_multiple_correct = true;
  }
  normalized.lock_answers = Boolean(normalized.lock_answers);

  const parsedReqToPass = Number.parseInt(normalized.req_to_pass, 10);
  if (!Number.isFinite(parsedReqToPass) || parsedReqToPass <= 0) {
    normalized.req_to_pass = questionsCount > 0 ? questionsCount : 0;
  } else {
    normalized.req_to_pass = Math.min(parsedReqToPass, questionsCount || parsedReqToPass);
  }

  if (!normalized.created_at) {
    normalized.created_at = new Date();
  }

  return normalized;
}

function buildReplaceOps(docs) {
  return docs.map((doc) => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true
    }
  }));
}

async function tempSeed() {
  try {
    await connectToDatabase();
    console.log("Connected to MongoDB successfully");

    const users = parseExtendedJson(loadJson("project_creative.users.json"));
    const friends = parseExtendedJson(loadJson("project_creative.friends.json"));
    const quizzesRaw = parseExtendedJson(loadJson("project_creative.quizzes.json"));
    const quizzes = quizzesRaw.map(normalizeQuiz);

    if (users.length) {
      await User.collection.bulkWrite(buildReplaceOps(users));
      console.log(`Upserted ${users.length} users`);
    }

    if (friends.length) {
      await Friend.collection.bulkWrite(buildReplaceOps(friends));
      console.log(`Upserted ${friends.length} friends`);
    }

    if (quizzes.length) {
      await Quiz.collection.bulkWrite(buildReplaceOps(quizzes));
      console.log(`Upserted ${quizzes.length} quizzes`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Temp seed failed:", error);
    process.exit(1);
  }
}

tempSeed();
