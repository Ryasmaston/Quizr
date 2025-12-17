const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const usersRouter = require("./routes/users");
// const quizzesRouter = require("./routes/quizzes");
const meRouter = require("./routes/me");
const requireAuth = require("./middleware/requireAuth");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Public routes
app.use("/users", usersRouter);

// Temp auth debug route
app.use("/me", meRouter);

// Protected feature routes
// app.use("/quizzes", requireAuth, quizzesRouter);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ err: "Error 404: Not Found" });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  if (process.env.NODE_ENV === "development") {
    res.status(500).send(err.message);
  } else {
    res.status(500).json({ err: "Something went wrong" });
  }
});

module.exports = app;
