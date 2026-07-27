import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import {
    toggleShortlist,
    sendExamInvite,
    sendBatchExamInvites,
    verifyExamToken,
    startExam,
    runCodeTest,
    submitExam,
    getExamByResumeId,
    updateInterviewStatus,
    sendConfirmation
} from "../controllers/examController.js"

const router = express.Router()

// ===================================
// PUBLIC CANDIDATE EXAM ROUTES
// ===================================
router.get("/verify/:token", verifyExamToken)
router.post("/start/:token", startExam)
router.post("/run-code", runCodeTest)
router.post("/submit/:token", submitExam)

// ===================================
// PROTECTED HR DASHBOARD ROUTES
// ===================================
router.post("/shortlist/:resumeId", protect, toggleShortlist)
router.post("/invite/:resumeId", protect, sendExamInvite)
router.post("/invite-batch", protect, sendBatchExamInvites)
router.get("/resume/:resumeId", protect, getExamByResumeId)
router.patch("/interview/:examId", protect, updateInterviewStatus)
router.post("/confirm-hiring/:resumeId", protect, sendConfirmation)

export default router
