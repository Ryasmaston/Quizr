const User = require("../models/user");
const Quiz = require("../models/quiz");
const Friend = require("../models/friend");
const admin = require("../lib/firebaseAdmin");

const PLACEHOLDER_AUTH_ID = "deleted-user";
const PLACEHOLDER_USERNAME = "__deleted__";
const PLACEHOLDER_EMAIL = "deleted@quiz.invalid";
const DEFAULT_MODE = "delete_quizzes";

async function getDeletedUserPlaceholder() {
  try {
    const placeholder = await User.findOneAndUpdate(
      { authId: PLACEHOLDER_AUTH_ID },
      {
        $setOnInsert: {
          authId: PLACEHOLDER_AUTH_ID,
          "user_data.email": PLACEHOLDER_EMAIL,
          "user_data.status": "active"
        },
        $set: {
          "user_data.username": PLACEHOLDER_USERNAME
        }
      },
      { new: true, upsert: true }
    );

    return placeholder;
  } catch (error) {
    if (error.code === 11000) {
      const existing = await User.findOne({ authId: PLACEHOLDER_AUTH_ID });
      if (existing) return existing;
    }
    throw error;
  }
}

async function removeUserAttempts(userId) {
  await Quiz.updateMany(
    { "attempts.user_id": userId },
    { $pull: { attempts: { user_id: userId } } }
  );
}

async function removeUserFriends(userId) {
  await Friend.deleteMany({
    $or: [{ user1: userId }, { user2: userId }]
  });
}

async function removeQuizzesFromFavourites(quizIds) {
  if (!quizIds.length) return;
  await User.updateMany(
    { "preferences.favourites": { $in: quizIds } },
    { $pull: { "preferences.favourites": { $in: quizIds } } }
  );
}

async function deleteFirebaseAuthUser(authId) {
  if (!authId) return;
  if (process.env.NODE_ENV === "test") return;
  try {
    await admin.auth().deleteUser(authId);
  } catch (error) {
    console.error("Failed to delete Firebase auth user:", error);
  }
}

async function executeUserDeletion(user, modeOverride) {
  if (!user) {
    throw new Error("User not found");
  }
  if (user.authId === PLACEHOLDER_AUTH_ID) {
    throw new Error("Cannot delete placeholder user");
  }

  const userId = user._id;
  const authId = user.authId;
  const deletionMode = modeOverride || user.user_data.deletion?.mode || DEFAULT_MODE;

  const createdQuizzes = await Quiz.find({ created_by: userId }).select("_id");
  const createdQuizIds = createdQuizzes.map((quiz) => quiz._id);

  if (deletionMode === "preserve_quizzes") {
    const placeholder = await getDeletedUserPlaceholder();
    await Quiz.updateMany(
      { created_by: userId },
      { $set: { created_by: placeholder._id } }
    );
  } else {
    if (createdQuizIds.length) {
      await Quiz.deleteMany({ created_by: userId });
      await removeQuizzesFromFavourites(createdQuizIds);
    }
  }

  await removeUserAttempts(userId);
  await removeUserFriends(userId);
  await User.deleteOne({ _id: userId });
  await deleteFirebaseAuthUser(authId);
}

async function runDueDeletions() {
  const now = new Date();
  const dueUsers = await User.find({
    "user_data.status": "pending_deletion",
    "user_data.deletion.scheduled_for": { $lte: now },
    authId: { $ne: PLACEHOLDER_AUTH_ID }
  });

  if (dueUsers.length === 0) return { processed: 0 };

  const results = await Promise.allSettled(
    dueUsers.map((user) => executeUserDeletion(user))
  );

  const processed = results.filter((result) => result.status === "fulfilled").length;
  return { processed };
}

module.exports = {
  getDeletedUserPlaceholder,
  executeUserDeletion,
  runDueDeletions
};
