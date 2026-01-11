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

describe("/users", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Quiz.deleteMany({});
  });

  describe("POST /api/users - createUser", () => {
    describe("when username is provided and user is authenticated", () => {
      test("the response code is 201", async () => {
        const response = await request(app)
          .post("/api/users")
          .send({ username: "testuser" });
        expect(response.statusCode).toBe(201);
      });
      test("a user is created with correct fields", async () => {
        const response = await request(app)
          .post("/api/users")
          .send({ username: "testuser" });

        const users = await User.find();
        expect(users.length).toEqual(1);
        const newUser = users[0];
        expect(newUser.user_data.username).toEqual("testuser");
        expect(newUser.user_data.email).toEqual("test@email.com");
        expect(newUser.authId).toEqual("test-auth-id");
      });
      test("returns user data in response", async () => {
        const response = await request(app)
          .post("/api/users")
          .send({ username: "testuser" });
        expect(response.body.message).toEqual("User created");
        expect(response.body.user.username).toEqual("testuser");
        expect(response.body.user.email).toEqual("test@email.com");
        expect(response.body.user.id).toBeDefined();
      });
    });

    describe("when username is missing", () => {
      test("response code is 400", async () => {
        const response = await request(app)
          .post("/api/users")
          .send({});
        expect(response.statusCode).toBe(400);
      });
      test("does not create a user", async () => {
        await request(app)
          .post("/api/users")
          .send({});
        const users = await User.find();
        expect(users.length).toEqual(0);
      });
    });
  });

  describe("GET /api/users/availability - checkUsernameAvailability", () => {
    beforeEach(async () => {
      const user = new User({
        user_data: {
          username: "existinguser",
          email: "existing@email.com"
        },
        authId: "existing-auth-id"
      });
      await user.save();
    });
    test("returns available: false when username exists", async () => {
      const response = await request(app)
        .get("/api/users/availability")
        .query({ username: "existinguser" });
      expect(response.statusCode).toBe(200);
      expect(response.body.available).toBe(false);
    });
    test("returns available: true when username is available", async () => {
      const response = await request(app)
        .get("/api/users/availability")
        .query({ username: "newuser" });
      expect(response.statusCode).toBe(200);
      expect(response.body.available).toBe(true);
    });
    test("returns 400 when username parameter is missing", async () => {
      const response = await request(app)
        .get("/api/users/availability");
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toEqual("Username is required");
    });
  });

  describe("PATCH /api/users/:userId - updateUser", () => {
    let user;

    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com"
        },
        authId: "test-auth-id"
      });
      await user.save();
    });
    test("updates username successfully", async () => {
      const response = await request(app)
        .patch(`/api/users/${user._id}`)
        .send({ username: "updateduser" });

      expect(response.statusCode).toBe(200);
      expect(response.body.user.user_data.username).toEqual("updateduser");
    });
    test("updates profile_pic successfully", async () => {
      const response = await request(app)
        .patch(`/api/users/${user._id}`)
        .send({
          username: "testuser",
          profile_pic: "http://example.com/pic.jpg"
        });
      expect(response.statusCode).toBe(200);
      expect(response.body.user.user_data.profile_pic).toEqual("http://example.com/pic.jpg");
    });
    test("returns 403 when user tries to update another user's profile", async () => {
      const otherUser = new User({
        user_data: {
          username: "otheruser",
          email: "other@email.com"
        },
        authId: "other-auth-id"
      });
      await otherUser.save();
      const response = await request(app)
        .patch(`/api/users/${otherUser._id}`)
        .send({ username: "hacked" });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toEqual("Unauthorized");
    });
    test("returns 404 when updating non-existent user", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .patch(`/api/users/${fakeId}`)
        .send({ username: "updateduser" });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /api/users/me - showUser", () => {
    let user, quiz;
    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com",
          profile_pic: "http://example.com/pic.jpg"
        },
        authId: "test-auth-id",
      });
      await user.save();
      const quizCreator = new User({
        user_data: {
          username: "quizcreator",
          email: "creator@email.com"
        },
        authId: "creator-auth-id"
      });
      await quizCreator.save();
      quiz = new Quiz({
        title: "Test Quiz",
        category: "science",
        created_by: quizCreator._id,
        req_to_pass: 70,
        questions: [{ text: "Q", answers: [{ text: "A", is_correct: true }] }]
      });
      await quiz.save();
      user.preferences.favourites.push(quiz._id);
      await user.save();
    });
    test("returns user profile with favourites", async () => {
      const response = await request(app)
        .get("/api/users/me");
      expect(response.statusCode).toBe(200);
      expect(response.body.user.user_data.username).toEqual("testuser");
      expect(response.body.user.user_data.profile_pic).toEqual("http://example.com/pic.jpg");
      expect(response.body.user.preferences.favourites).toHaveLength(1);
      expect(response.body.user.preferences.favourites[0].title).toEqual("Test Quiz");
    });
    test("returns 404 when user not found", async () => {
      await User.deleteMany({});
      const response = await request(app)
        .get("/api/users/me");

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toEqual("User not found");
    });
  });

  describe("GET /api/users/search - searchUsers", () => {
    beforeEach(async () => {
      const users = [
        { user_data: { username: "alice", email: "alice@email.com" }, authId: "alice-id" },
        { user_data: { username: "alison", email: "alison@email.com" }, authId: "alison-id" },
        { user_data: { username: "bob", email: "bob@email.com" }, authId: "bob-id" },
        { user_data: { username: "charlie", email: "charlie@email.com" }, authId: "charlie-id" }
      ];
      await User.insertMany(users);
    });
    test("returns matching users for partial search", async () => {
      const response = await request(app)
        .get("/api/users/search")
        .query({ q: "ali" });
      expect(response.statusCode).toBe(200);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].username).toMatch(/ali/i);
    });
    test("returns empty array for query less than 2 characters", async () => {
      const response = await request(app)
        .get("/api/users/search")
        .query({ q: "a" });
      expect(response.statusCode).toBe(200);
      expect(response.body.users).toHaveLength(0);
    });
    test("search is case insensitive", async () => {
      const response = await request(app)
        .get("/api/users/search")
        .query({ q: "BOB" });

      expect(response.statusCode).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].username).toEqual("bob");
    });
  });

  describe("GET /api/users/:userId - getUserById", () => {
    let user;
    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com",
          profile_pic: "http://example.com/pic.jpg"
        },
        authId: "test-auth-id"
      });
      await user.save();
    });
    test("returns user by id", async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.user.user_data.username).toEqual("testuser");
      expect(response.body.user.user_data.profile_pic).toEqual("http://example.com/pic.jpg");
      expect(response.body.user.user_data.created_at).toBeDefined();
    });
    test("returns 404 when user not found", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .get(`/api/users/${fakeId}`);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toEqual("User not found");
    });
  });

  describe("GET /api/users/username/:username - getUserIdByUsername", () => {
    let user;
    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com"
        },
        authId: "test-auth-id"
      });
      await user.save();
    });
    test("returns userId for valid username", async () => {
      const response = await request(app)
        .get("/api/users/username/testuser");

      expect(response.statusCode).toBe(200);
      expect(response.body.userId).toEqual(user._id.toString());
    });
    test("returns 404 when username not found", async () => {
      const response = await request(app)
        .get("/api/users/username/nonexistent");

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toEqual("User not found");
    });
  });

  describe("DELETE /api/users/:userId - deleteUser", () => {
    let user;
    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com"
        },
        authId: "test-auth-id"
      });
      await user.save();
    });
    test("deletes user successfully", async () => {
      const response = await request(app)
        .delete(`/api/users/${user._id}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toEqual("User deleted");

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });
  });

  describe("POST /api/users/me/favourites/:quizId - addFavourite", () => {
    let user, quiz;
    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com"
        },
        authId: "test-auth-id"
      });
      await user.save();
      quiz = new Quiz({
        title: "Test Quiz",
        category: "science",
        created_by: user._id,
        req_to_pass: 70,
        questions: [{ text: "Q", answers: [{ text: "A", is_correct: true }] }]
      });
      await quiz.save();
    });
    test("adds quiz to favourites successfully", async () => {
      const response = await request(app)
        .post(`/api/users/me/favourites/${quiz._id}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toEqual("Quiz added to favourites");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.preferences.favourites).toContainEqual(quiz._id);
    });
    test("does not add duplicate favourites", async () => {
      await request(app).post(`/api/users/me/favourites/${quiz._id}`);
      await request(app).post(`/api/users/me/favourites/${quiz._id}`);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.preferences.favourites).toHaveLength(1);
    });
  });

  describe("DELETE /api/users/me/favourites/:quizId - removeFavourite", () => {
    let user, quiz;
    beforeEach(async () => {
      user = new User({
        user_data: {
          username: "testuser",
          email: "test@email.com"
        },
        authId: "test-auth-id"
      });
      quiz = new Quiz({
        title: "Test Quiz",
        category: "history",
        created_by: user._id,
        req_to_pass: 70,
        questions: [{ text: "Q", answers: [{ text: "A", is_correct: true }] }]
      });
      await quiz.save();
      user.preferences.favourites.push(quiz._id);
      await user.save();
    });
    test("removes quiz from favourites successfully", async () => {
      const response = await request(app)
        .delete(`/api/users/me/favourites/${quiz._id}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toEqual("Quiz removed from favourites");
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.preferences.favourites).not.toContainEqual(quiz._id);
    });
  });
});
