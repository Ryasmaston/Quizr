const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const requireAuth = require("./middleware/requireAuth");
const usersRouter = require("./routes/users");
const meRouter = require("./routes/me");
const quizzesRouter = require("./routes/quizzes");
const friendsRouter = require("./routes/friends")

const app = express();
const apiBase = "/api";

app.use(cors());
app.use(bodyParser.json());

// public health route, only for API testing
app.get(["/health", `${apiBase}/health`], (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// public username availability check
app.use(`${apiBase}/users`, usersRouter);

app.use(`${apiBase}/me`, requireAuth, meRouter);
app.use(`${apiBase}/quizzes`, requireAuth, quizzesRouter);
app.use(`${apiBase}/friends`, requireAuth, friendsRouter);

if (process.env.NODE_ENV === "production") {
  const frontendDir = path.join(__dirname, "..", "frontend", "dist");
  const spaIndex = path.join(frontendDir, "index.html");
  const apiPrefixes = [apiBase];

  app.use(express.static(frontendDir));
  app.get("*", (req, res, next) => {
    if (apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }
    res.sendFile(spaIndex);
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ err: "Error 404: Not Found" });
});

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ err: "Something went wrong" });
});

module.exports = app;
