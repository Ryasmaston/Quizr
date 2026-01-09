require("../mongodb_helper");
const User = require("../../models/user");
const Quiz = require("../../models/quiz");
const mongoose = require("mongoose");

describe("User model", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Quiz.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Quiz.deleteMany({});
  });

  it("has a username", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(user.username).toEqual("testuser");
  });

  it("has an email address", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(user.email).toEqual("test@example.com");
  });

  it("has an authId", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(user.authId).toEqual("test-auth-id-123");
  });

  it("trims whitespace from username", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "  testuser  ",
      email: "test@example.com",
    });
    expect(user.username).toEqual("testuser");
  });

  it("trims whitespace from email", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "  test@example.com  ",
    });
    expect(user.email).toEqual("test@example.com");
  });

  it("has an optional profile_pic field", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
      profile_pic: "https://example.com/pic.jpg",
    });
    expect(user.profile_pic).toEqual("https://example.com/pic.jpg");
  });

  it("profile_pic is undefined by default", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(user.profile_pic).toBeUndefined();
  });

  it("has a created_at timestamp", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(user.created_at).toBeInstanceOf(Date);
  });

  it("defaults favourites to empty array", () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    expect(user.favourites).toEqual([]);
  });

  it("can save a user", async () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    await user.save();
    const users = await User.find();
    expect(users.length).toEqual(1);
    expect(users[0].username).toEqual("testuser");
    expect(users[0].email).toEqual("test@example.com");
    expect(users[0].authId).toEqual("test-auth-id-123");
  });

  it("requires authId field", async () => {
    const user = new User({
      username: "testuser",
      email: "test@example.com",
    });
    await expect(user.save()).rejects.toThrow();
  });

  it("requires username field", async () => {
    const user = new User({
      authId: "test-auth-id-123",
      email: "test@example.com",
    });
    await expect(user.save()).rejects.toThrow();
  });

  it("requires email field", async () => {
    const user = new User({
      authId: "test-auth-id-123",
      username: "testuser",
    });
    await expect(user.save()).rejects.toThrow();
  });

  it("enforces unique authId constraint", async () => {
    const user1 = new User({
      authId: "duplicate-auth-id",
      username: "user1",
      email: "user1@example.com",
    });
    await user1.save();
    const user2 = new User({
      authId: "duplicate-auth-id",
      username: "user2",
      email: "user2@example.com",
    });
    await expect(user2.save()).rejects.toThrow();
  });

  it("can store quiz references in favourites", async () => {
    const user = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    const quiz = await Quiz.create({
      title: "Test Quiz",
      created_by: user._id,
      category: "other",
      req_to_pass: 1,
      questions: [
        {
          text: "Test question",
          answers: [{ text: "Answer", is_correct: true }],
        },
      ],
    });
    user.favourites.push(quiz._id);
    await user.save();
    const savedUser = await User.findById(user._id);
    expect(savedUser.favourites.length).toEqual(1);
    expect(savedUser.favourites[0].toString()).toEqual(quiz._id.toString());
  });

  it("can populate favourites with quiz details", async () => {
    const user = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    const quiz = await Quiz.create({
      title: "Favorite Quiz",
      created_by: user._id,
      category: "science",
      req_to_pass: 1,
      questions: [
        {
          text: "Test question",
          answers: [{ text: "Answer", is_correct: true }],
        },
      ],
    });
    user.favourites.push(quiz._id);
    await user.save();
    const populatedUser = await User.findById(user._id).populate("favourites");
    expect(populatedUser.favourites.length).toEqual(1);
    expect(populatedUser.favourites[0].title).toEqual("Favorite Quiz");
    expect(populatedUser.favourites[0].category).toEqual("science");
  });

  it("can add multiple quizzes to favourites", async () => {
    const user = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    const quiz1 = await Quiz.create({
      title: "Quiz 1",
      created_by: user._id,
      category: "art",
      req_to_pass: 1,
    });
    const quiz2 = await Quiz.create({
      title: "Quiz 2",
      created_by: user._id,
      category: "music",
      req_to_pass: 1,
    });
    user.favourites.push(quiz1._id, quiz2._id);
    await user.save();
    const savedUser = await User.findById(user._id);
    expect(savedUser.favourites.length).toEqual(2);
  });

  it("can remove a quiz from favourites", async () => {
    const user = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    const quiz = await Quiz.create({
      title: "Test Quiz",
      created_by: user._id,
      category: "other",
      req_to_pass: 1,
    });

    user.favourites.push(quiz._id);
    await user.save();
    user.favourites = user.favourites.filter(
      (id) => id.toString() !== quiz._id.toString()
    );
    await user.save();
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.favourites.length).toEqual(0);
  });

  it("can find user by authId", async () => {
    await User.create({
      authId: "firebase-uid-123",
      username: "testuser",
      email: "test@example.com",
    });
    const foundUser = await User.findOne({ authId: "firebase-uid-123" });
    expect(foundUser).not.toBeNull();
    expect(foundUser.username).toEqual("testuser");
  });

  it("can find user by username", async () => {
    await User.create({
      authId: "test-auth-id-123",
      username: "uniqueuser",
      email: "test@example.com",
    });
    const foundUser = await User.findOne({ username: "uniqueuser" });
    expect(foundUser).not.toBeNull();
    expect(foundUser.email).toEqual("test@example.com");
  });

  it("can update user profile", async () => {
    const user = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    user.username = "updateduser";
    user.profile_pic = "https://example.com/newpic.jpg";
    await user.save();
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.username).toEqual("updateduser");
    expect(updatedUser.profile_pic).toEqual("https://example.com/newpic.jpg");
  });

  it("can delete a user", async () => {
    const user = await User.create({
      authId: "test-auth-id-123",
      username: "testuser",
      email: "test@example.com",
    });
    await User.findByIdAndDelete(user._id);
    const users = await User.find();
    expect(users.length).toEqual(0);
  });
});
