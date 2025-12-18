require("../mongodb_helper");
const User = require("../../models/user");

describe("User model", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  it("has a username", () => {
    const user = new User({
      username: "testuser",
      email: "test@example.com",
      password: "Testpass123",
    });
    expect(user.username).toEqual("testuser");
  });

  it("has an email address", () => {
    const user = new User({
      username: "testuser",
      email: "test@example.com",
      password: "Testpass123",
    });
    expect(user.email).toEqual("test@example.com");
  });

  it("has a password", () => {
    const user = new User({
      username: "testuser",
      email: "test@example.com",
      password: "Testpass123",
    });
    expect(user.password).toEqual("Testpass123");
  });
  it("defaults quizzes to 0", () => {
    const user = new User({
      username: "testuser",
      email: "test@example.com",
      password: "Testpass123",
    });
    expect(user.quizzes).toEqual(0);
  });

  it("can save a user", async () => {
    const user = new User({
      username: "testuser",
      email: "test@example.com",
      password: "Testpass123",
    });
    await user.save();
    const users = await User.find();
    expect(users[0].username).toEqual("testuser");
    expect(users[0].email).toEqual("test@example.com");
    expect(users[0].password).toEqual("Testpass123");
  });
});
