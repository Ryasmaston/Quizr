const express = require("express");
const router = express.Router();

const tokenChecker = require("../middleware/requireAuth")

router.get("/me", tokenChecker, (req, res) => {
    res.status(200).json({
        uid: req.user.uid,
        email: req.user.email || null,
    });
});

module.exports = router;

