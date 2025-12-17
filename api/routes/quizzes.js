const express = require("express");
const router = express.Router();

const PostsController = require("../controllers/quizzes");

router.get("/", PostsController.getAllPosts);
router.post("/", PostsController.createPost);

module.exports = router;
