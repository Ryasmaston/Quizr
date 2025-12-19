const request = require("supertest");
const app = require("../../app");
const User = require("../../models/user");
require("../mongodb_helper");

describe("/users", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("POST /users, when username, email and password are provided", () => {
    test("the response code is 201", async () => {
      const response = await request(app)
        .post("/users")
        .send({
          username: "testuser",
          email: "test@email.com",
          password: "Testpass123"
        });
      expect(response.statusCode).toBe(201);
    });

    test("a user is created", async () => {
      await request(app)
        .post("/users")
        .send({
          username: "testuser",
          email: "test@email.com",
          password: "Testpass123" });
      const users = await User.find();
      expect(users.length).toEqual(1)
      const newUser = users[0]
      expect(newUser.username).toEqual("testuser")
      expect(newUser.email).toEqual("test@email.com");
    });
  });

  describe("POST /users, when password is missing", () => {
    test("response code is 400", async () => {
      const response = await request(app)
        .post("/users")
        .send({
          username: "testuser",
          email: "test@email.com"
        });
      expect(response.statusCode).toBe(400);
    });

    test("does not create a user", async () => {
      await request(app)
        .post("/users")
        .send({
          username: "testuser",
          email: "test@email.com" });
      const users = await User.find();
      expect(users.length).toEqual(0);
    });
  });

  describe("POST, when email is missing", () => {
    test("response code is 400", async () => {
      const response = await request(app)
        .post("/users")
        .send({
          username: "testuser",
          password: "Testpass123"
        });
      expect(response.statusCode).toBe(400);
    });

    test("does not create a user", async () => {
      await request(app)
        .post("/users")
        .send({
          username: "testuser",
          password: "Testpass123"
        });
      const users = await User.find();
      expect(users.length).toEqual(0);
    });
  });

  describe("POST, when username is missing", () => {
    test("response code is 400", async () => {
      const response = await request(app)
        .post("/users")
        .send({
          email: "test@email.com",
          password: "Testpass123"
        });
      expect(response.statusCode).toBe(400);
    });

    test("does not create a user", async () => {
      await request(app)
        .post("/users")
        .send({
          email: "test@email.com",
          password: "Testpass123"
        });
      const users = await User.find();
      expect(users.length).toEqual(0);
    });
  });

});
