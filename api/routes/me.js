import express from "express"
import { requireAuth } from "../middleware/requireAuth"

const router = express.Router()

router.get("/me", requireAuth, (req, res) => {
    res.json({uid: req.user.uid, email: req.user.email || null})
})

export default router