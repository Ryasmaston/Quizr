const User = require("../models/user");

async function requireActiveUser(req, res, next) {
  try {
    const user = await User.findOne({ authId: req.user.uid }).select(
      "username status authId"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.authId === "deleted-user") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    if (user.status === "pending_deletion") {
      const isReadRequest = req.method === "GET";
      if (!isReadRequest) {
        return res.status(423).json({
          message: "Account pending deletion",
          username: user.username
        });
      }
    }
    req.currentUser = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load user" });
  }
}

module.exports = requireActiveUser;
