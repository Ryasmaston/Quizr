const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const requireAuth = require("./middleware/requireAuth");
const usersRouter = require("./routes/users");
const meRouter = require("./routes/me");
// const quizzesRouter = require("./routes/quizzes");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// public health route, only for API testing
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ----------------------------------------------------
// AUTHENTICATION GATE, everything below requires auth
app.use(requireAuth);
// ----------------------------------------------------


app.use("/me", meRouter);
app.use("/users", usersRouter);
// app.use("/quizzes", quizzesRouter);

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
