import admin from "../lib/firebaseAdmin"

export async function requireAuth(req, res, next) {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null // to get stuff after Bearer:
    if (!token) return res.status(401).json({message: "Missing token"})
    try {
        req.user = await admin.auth().verifyIdToken(token) // has uid, email etc.
        next()
    } catch {
        return res.status(401).json({message: "Invalid token"})
    }
}