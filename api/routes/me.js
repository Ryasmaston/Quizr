const express = require("express");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
    res.json({
    uid: req.user.uid,
    email: req.user.email || null,
    });
});

module.exports = router;
