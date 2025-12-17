const User = require("../models/user");

async function upsertMe(req, res) {
  const firebaseUid = req.user.uid;
  const email = req.user.email || null;

  const user = await User.findOneAndUpdate(
    { firebaseUid },
    { firebaseUid, email },
    { upsert: true, new: true }
  );

  res.status(201).json({ user });
}

module.exports = { upsertMe };
