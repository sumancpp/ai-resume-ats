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
    sendConfirmation,
    sendVideoInterviewInvite,
    verifyInterviewToken,
    notifyCandidateJoinedMeet,
    generateCustomQuestions,
    sendConfiguredExam,
    sendShortlistNotice,
    sendRound1Passed,
    sendOfferLetter,
    logProctoringEvent
} from "../controllers/examController.js"

const router = express.Router()

// ===================================
// PUBLIC CANDIDATE EXAM & INTERVIEW ROUTES
// ===================================
router.get("/verify/:token", verifyExamToken)
router.post("/start/:token", startExam)
router.post("/run-code", runCodeTest)
router.post("/submit/:token", submitExam)
router.post("/proctoring-log/:token", logProctoringEvent)
router.get("/interview-verify/:token", verifyInterviewToken)
router.post("/candidate-joined-meet/:token", notifyCandidateJoinedMeet)

// ===================================
// PROTECTED HR DASHBOARD ROUTES
// ===================================
router.post("/shortlist/:resumeId", protect, toggleShortlist)
router.post("/invite/:resumeId", protect, sendExamInvite)
router.post("/invite-batch", protect, sendBatchExamInvites)
router.get("/resume/:resumeId", protect, getExamByResumeId)
router.patch("/interview/:examId", protect, updateInterviewStatus)
router.post("/interview-invite/:resumeId", protect, sendVideoInterviewInvite)
router.post("/confirm-hiring/:resumeId", protect, sendConfirmation)

// ===================================
// PROTECTED HR STAGE & CUSTOM EXAM ROUTES
// ===================================
router.post("/generate-custom-questions", protect, generateCustomQuestions)
router.post("/send-configured-exam", protect, sendConfiguredExam)
router.post("/send-shortlist-notice", protect, sendShortlistNotice)
router.post("/send-round1-passed", protect, sendRound1Passed)
router.post("/send-offer-letter", protect, sendOfferLetter)

export default router

