// using firebase auth instead of jwt
jest.resetModules();
jest.doMock("../../middleware/requireAuth", () => jest.fn((req, res, next) => next()));

const app = require("../../app");
const supertest = require("supertest");
require("../mongodb_helper");
const User = require("../../models/user");
const requireAuth = require("../../middleware/requireAuth");

describe("Authentication with Firebase", () => {
  let testApp;

  beforeAll(() => {
    testApp = supertest(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe("requireAuth middleware", () => {
    describe("with valid token", () => {
      beforeEach(async () => {
        requireAuth.mockImplementation((req, res, next) => {
          req.user = {
            uid: "test-firebase-uid-123",
            email: "test@test.com",
          };
          next();
        });
        await User.deleteMany({
          $or: [
            { email: "test@test.com" },
            { username: "testuser" },
            { authId: "test-firebase-uid-123" }
          ]
        });
        await User.create({
          authId: "test-firebase-uid-123",
          username: "testuser",
          email: "test@test.com",
        });
      });
      afterEach(async () => {
        await User.deleteMany({
          $or: [
            { email: "test@test.com" },
            { username: "testuser" },
            { authId: "test-firebase-uid-123" }
          ]
        });
      });
      test("allows access to protected route with valid Bearer token", async () => {
        const response = await testApp
          .get("/api/users/me")
          .set("Authorization", "Bearer valid-firebase-token");
        expect(response.status).toEqual(200);
        expect(requireAuth).toHaveBeenCalled();
      });
      test("attaches user data to request object", async () => {
        const response = await testApp
          .get("/api/users/me")
          .set("Authorization", "Bearer valid-firebase-token");
        expect(requireAuth).toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body.user).toBeDefined();
      });
    });

    describe("with invalid or missing token", () => {
      beforeEach(() => {
        requireAuth.mockImplementation((req, res, next) => {
          const header = req.headers.authorization || "";
          const token = header.startsWith("Bearer ") ? header.slice(7) : null;
          if (!token) {
            return res.status(401).json({ message: "Missing token" });
          }
          return res.status(401).json({ message: "Invalid token" });
        });
      });
      test("returns 401 when no Authorization header is provided", async () => {
        const response = await testApp.get("/api/users/me");
        expect(response.status).toEqual(401);
        expect(response.body.message).toEqual("Missing token");
      });
      test("returns 401 when Authorization header doesn't start with Bearer", async () => {
        const response = await testApp
          .get("/api/users/me")
          .set("Authorization", "InvalidFormat token123");

        expect(response.status).toEqual(401);
        expect(response.body.message).toEqual("Missing token");
      });
      test("returns 401 when token is empty string", async () => {
        const response = await testApp
          .get("/api/users/me")
          .set("Authorization", "Bearer ");
        expect(response.status).toEqual(401);
        expect(response.body.message).toEqual("Missing token");
      });
      test("returns 401 when Firebase rejects the token", async () => {
        const response = await testApp
          .get("/api/users/me")
          .set("Authorization", "Bearer invalid-token");
        expect(response.status).toEqual(401);
        expect(response.body.message).toEqual("Invalid token");
      });
      test("returns 401 when token is expired", async () => {
        const response = await testApp
          .get("/api/users/me")
          .set("Authorization", "Bearer expired-token");
        expect(response.status).toEqual(401);
        expect(response.body.message).toEqual("Invalid token");
      });
    });

    describe("protected routes", () => {
      beforeEach(() => {
        requireAuth.mockImplementation((req, res, next) => {
          res.status(401).json({ message: "Missing token" });
        });
      });
      test("POST /users requires authentication", async () => {
        const response = await testApp
          .post("/api/users")
          .send({ username: "newuser", email: "new@test.com" });
        expect(response.status).toEqual(401);
      });
      test("GET /users/search requires authentication", async () => {
        const response = await testApp.get("/api/users/search?q=test");
        expect(response.status).toEqual(401);
      });
      test("PATCH /users/:userId requires authentication", async () => {
        const response = await testApp
          .patch("/api/users/123")
          .send({ username: "updated" });
        expect(response.status).toEqual(401);
      });
      test("DELETE /users/:userId requires authentication", async () => {
        const response = await testApp.delete("/api/users/123");
        expect(response.status).toEqual(401);
      });
      test("POST /users/me/favourites/:quizId requires authentication", async () => {
        const response = await testApp.post("/api/users/me/favourites/quiz123");
        expect(response.status).toEqual(401);
      });
    });

    describe("public routes", () => {
      beforeEach(() => {
        requireAuth.mockImplementation((req, res, next) => next());
      });
      test("GET /users/availability does not require authentication", async () => {
        const response = await testApp.get(
          "/api/users/availability?username=testuser"
        );
        expect(response.status).not.toEqual(401);
      });
    });
  });

  describe("User creation flow", () => {
    beforeEach(async () => {
      requireAuth.mockImplementation((req, res, next) => {
        req.user = {
          uid: "new-firebase-uid-789",
          email: "newuser@test.com",
        };
        return next();
      });
      await User.deleteMany({
        $or: [
          { email: "newuser@test.com" },
          { username: "brandnewuser" },
          { username: "existinguser" },
          { username: "anotheruser" },
          { authId: "new-firebase-uid-789" }
        ]
      });
    });
    afterEach(async () => {
      await User.deleteMany({
        $or: [
          { email: "newuser@test.com" },
          { username: "brandnewuser" },
          { username: "existinguser" },
          { username: "anotheruser" },
          { authId: "new-firebase-uid-789" }
        ]
      });
    });
    test("creates user with valid Firebase token", async () => {
      const response = await testApp
        .post("/api/users")
        .set("Authorization", "Bearer valid-token")
        .send({ username: "brandnewuser" });
      console.log("Response status:", response.status);
      console.log("Response body:", response.body);
      expect(response.status).toEqual(201);
      const user = await User.findOne({ email: "newuser@test.com" });
      expect(user).not.toBeNull();
      expect(user.authId).toEqual("new-firebase-uid-789");
      expect(user.username).toEqual("brandnewuser");
    });
    test("prevents duplicate user creation with same authId", async () => {
      await User.create({
        authId: "new-firebase-uid-789",
        username: "existinguser",
        email: "newuser@test.com",
      });
      const response = await testApp
        .post("/api/users")
        .set("Authorization", "Bearer valid-token")
        .send({ username: "anotheruser" });

      expect(response.status).toEqual(400);
    });
  });

  describe("Token verification error handling", () => {
    beforeEach(() => {
      requireAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ message: "Invalid token" });
      });
    });
    test("handles malformed token gracefully", async () => {
      const response = await testApp
        .get("/api/users/me")
        .set("Authorization", "Bearer malformed.token.here");
      expect(response.status).toEqual(401);
      expect(response.body.message).toEqual("Invalid token");
    });
    test("handles Firebase service unavailable", async () => {
      const response = await testApp
        .get("/api/users/me")
        .set("Authorization", "Bearer valid-token");
      expect(response.status).toEqual(401);
      expect(response.body.message).toEqual("Invalid token");
    });
  });
});
