const admin = require("../lib/firebaseAdmin");

async function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Missing token" });

    try {
        req.user = await admin.auth().verifyIdToken(token);
        return next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
}

module.exports = requireAuth;