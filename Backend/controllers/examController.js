import crypto from "crypto"
import Exam from "../models/Exam.js"
import Resume from "../models/Resume.js"
import { generateExamQuestions, evaluateExamSubmission } from "../ai/examAiService.js"
import { runJsCode } from "../helpers/codeRunner.js"
import { sendExamInviteEmail, sendHiringConfirmationEmail, sendVideoInterviewInviteEmail } from "../utils/sendEmail.js"

/**
 * Toggle CV Shortlist status for a candidate
 */
export const toggleShortlist = async (req, res) => {
    try {
        const { resumeId } = req.params
        const resume = await Resume.findOne({ _id: resumeId, user: req.user._id })

        if (!resume) {
            return res.status(404).json({ success: false, message: "Resume not found" })
        }

        resume.isShortlisted = !resume.isShortlisted
        if (resume.isShortlisted && resume.hiringStatus === "none") {
            resume.hiringStatus = "shortlisted"
        }
        await resume.save()

        res.json({
            success: true,
            isShortlisted: resume.isShortlisted,
            message: resume.isShortlisted ? "Candidate shortlisted successfully!" : "Candidate removed from shortlist."
        })
    } catch (error) {
        console.error("Toggle shortlist error:", error)
        res.status(500).json({ success: false, message: "Error updating shortlist status" })
    }
}

/**
 * Send Exam Invite Email with 24-hour token link to candidate
 */
export const sendExamInvite = async (req, res) => {
    try {
        const { resumeId } = req.params
        const { candidateEmail } = req.body

        const resume = await Resume.findOne({ _id: resumeId, user: req.user._id })
        if (!resume) {
            return res.status(404).json({ success: false, message: "Resume not found" })
        }

        const emailToSend = candidateEmail?.trim() || resume.email || "candidate@example.com"
        resume.email = emailToSend
        resume.isShortlisted = true

        // Generate unique crypto token for 24-hour access link
        const token = crypto.randomBytes(24).toString("hex")
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Generate AI-tailored exam questions based on CV text & skills
        console.log(`Generating AI exam questions for candidate: ${resume.name}...`)
        const questions = await generateExamQuestions(
            resume.resumeText || "",
            resume.skills || [],
            resume.roleCategory || "Software Engineering"
        )

        const exam = await Exam.create({
            resume: resume._id,
            user: req.user._id,
            candidateEmail: emailToSend,
            candidateName: resume.name || "Candidate",
            token,
            expiresAt,
            questions,
            status: "pending"
        })

        resume.latestExam = exam._id
        resume.examStatus = "invited"
        resume.hiringStatus = "exam_invited"
        await resume.save()

        // Frontend URL host
        const host = req.get("origin") || req.get("referer") || "http://localhost:5173"
        const cleanHost = host.replace(/\/$/, "")
        const examLink = `${cleanHost}/exam/${token}`

        // Send Email
        await sendExamInviteEmail({
            to: emailToSend,
            candidateName: resume.name || "Candidate",
            examLink,
            expiresAt
        })

        res.json({
            success: true,
            examId: exam._id,
            token,
            examLink,
            expiresAt,
            message: `Exam invite successfully sent to ${emailToSend}! Link is valid for 24 hours.`
        })
    } catch (error) {
        console.error("Send exam invite error:", error)
        res.status(500).json({ success: false, message: "Error sending exam invite email" })
    }
}

/**
 * Send Exam Invites in Batch to all Shortlisted Candidates
 */
export const sendBatchExamInvites = async (req, res) => {
    try {
        const shortlistedResumes = await Resume.find({ user: req.user._id, isShortlisted: true })
        if (shortlistedResumes.length === 0) {
            return res.status(400).json({ success: false, message: "No shortlisted candidates found to invite." })
        }

        let sentCount = 0
        const host = req.get("origin") || req.get("referer") || "http://localhost:5173"
        const cleanHost = host.replace(/\/$/, "")

        for (const resume of shortlistedResumes) {
            const emailToSend = resume.email || `${resume.name.toLowerCase().replace(/\s+/g, ".")}@example.com`
            const token = crypto.randomBytes(24).toString("hex")
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

            const questions = await generateExamQuestions(
                resume.resumeText || "",
                resume.skills || [],
                resume.roleCategory || "Software Engineering"
            )

            const exam = await Exam.create({
                resume: resume._id,
                user: req.user._id,
                candidateEmail: emailToSend,
                candidateName: resume.name || "Candidate",
                token,
                expiresAt,
                questions,
                status: "pending"
            })

            resume.latestExam = exam._id
            resume.examStatus = "invited"
            resume.hiringStatus = "exam_invited"
            await resume.save()

            const examLink = `${cleanHost}/exam/${token}`
            await sendExamInviteEmail({
                to: emailToSend,
                candidateName: resume.name || "Candidate",
                examLink,
                expiresAt
            })

            sentCount++
        }

        res.json({
            success: true,
            sentCount,
            message: `Successfully generated AI exams and sent invitations to ${sentCount} shortlisted candidate(s)!`
        })
    } catch (error) {
        console.error("Batch exam invite error:", error)
        res.status(500).json({ success: false, message: "Error processing batch exam invites" })
    }
}

/**
 * Verify Exam Token (Public endpoint for candidate)
 */
export const verifyExamToken = async (req, res) => {
    try {
        const { token } = req.params
        const exam = await Exam.findOne({ token })

        if (!exam) {
            return res.status(404).json({ success: false, message: "Invalid or non-existent exam link." })
        }

        // Check 24-hour expiration
        if (new Date() > new Date(exam.expiresAt)) {
            exam.status = "expired"
            await exam.save()
            return res.status(410).json({
                success: false,
                isExpired: true,
                message: "This exam invitation link has EXPIRED after 24 hours. Please contact HR for a new invite."
            })
        }

        if (exam.status === "completed") {
            return res.json({
                success: true,
                isCompleted: true,
                candidateName: exam.candidateName,
                score: exam.score,
                submittedAt: exam.timer?.submittedAt,
                message: "Exam has already been submitted."
            })
        }

        // Hide answer keys from candidate payload
        const sanitizedQuestions = exam.questions.map((q) => {
            const copy = { ...q.toObject() }
            delete copy.correctOptionIndex
            if (copy.testCases) {
                copy.testCases = copy.testCases.map((tc) => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    description: tc.description
                }))
            }
            return copy
        })

        res.json({
            success: true,
            candidateName: exam.candidateName,
            status: exam.status,
            expiresAt: exam.expiresAt,
            totalMinutes: exam.timer?.totalMinutes || 10,
            startedAt: exam.timer?.startedAt || null,
            questions: sanitizedQuestions
        })
    } catch (error) {
        console.error("Verify token error:", error)
        res.status(500).json({ success: false, message: "Error verifying exam link" })
    }
}

/**
 * Start Exam Timer
 */
export const startExam = async (req, res) => {
    try {
        const { token } = req.params
        const exam = await Exam.findOne({ token })

        if (!exam) {
            return res.status(404).json({ success: false, message: "Exam not found" })
        }

        if (new Date() > new Date(exam.expiresAt)) {
            exam.status = "expired"
            await exam.save()
            return res.status(410).json({ success: false, message: "Exam link expired" })
        }

        if (!exam.timer.startedAt) {
            exam.timer.startedAt = new Date()
            exam.status = "in_progress"
            await exam.save()

            await Resume.findByIdAndUpdate(exam.resume, { examStatus: "in_progress" })
        }

        res.json({
            success: true,
            startedAt: exam.timer.startedAt,
            totalMinutes: exam.timer.totalMinutes || 10
        })
    } catch (error) {
        console.error("Start exam error:", error)
        res.status(500).json({ success: false, message: "Error starting exam" })
    }
}

/**
 * Sandboxed Code Execution against test cases
 */
export const runCodeTest = async (req, res) => {
    try {
        const { code, testCases } = req.body

        if (!code || typeof code !== "string") {
            return res.status(400).json({ success: false, message: "Code string required" })
        }

        const testResults = runJsCode(code, testCases || [])

        const passedCount = testResults.filter((r) => r.passed).length

        res.json({
            success: true,
            totalTestCases: testResults.length,
            passedCount,
            testResults
        })
    } catch (error) {
        console.error("Run code test error:", error)
        res.status(500).json({ success: false, message: "Execution error during test case run" })
    }
}

/**
 * Submit Exam Answers & Code Solutions
 */
export const submitExam = async (req, res) => {
    try {
        const { token } = req.params
        const { answers, codeSubmissions } = req.body

        const exam = await Exam.findOne({ token })
        if (!exam) {
            return res.status(404).json({ success: false, message: "Exam not found" })
        }

        if (exam.status === "completed") {
            return res.json({ success: true, message: "Exam already submitted", score: exam.score })
        }

        exam.answers = answers || {}
        
        // Evaluate candidate code submissions against test cases
        const evaluatedCodeSubmissions = []
        if (Array.isArray(codeSubmissions)) {
            for (const sub of codeSubmissions) {
                const questionObj = exam.questions.find((q) => q.id === sub.questionId)
                const testCases = questionObj?.testCases || []
                const testResults = runJsCode(sub.code || "", testCases)

                evaluatedCodeSubmissions.push({
                    questionId: sub.questionId,
                    code: sub.code,
                    testResults
                })
            }
        }
        exam.codeSubmissions = evaluatedCodeSubmissions

        // AI Evaluation & Grading
        const evalResult = await evaluateExamSubmission(exam.questions, answers || {}, evaluatedCodeSubmissions)

        exam.score = evalResult.score
        exam.aiFeedback = evalResult.aiFeedback
        exam.status = "completed"
        exam.timer.submittedAt = new Date()
        await exam.save()

        // Update candidate resume
        await Resume.findByIdAndUpdate(exam.resume, {
            examStatus: "completed",
            examScore: evalResult.score,
            hiringStatus: evalResult.score >= 50 ? "exam_completed" : "exam_completed"
        })

        res.json({
            success: true,
            score: evalResult.score,
            aiFeedback: evalResult.aiFeedback,
            message: "Exam submitted successfully! Evaluation complete."
        })
    } catch (error) {
        console.error("Submit exam error:", error)
        res.status(500).json({ success: false, message: "Error submitting exam" })
    }
}

/**
 * Get Exam Results for HR Dashboard
 */
export const getExamByResumeId = async (req, res) => {
    try {
        const { resumeId } = req.params
        const exam = await Exam.findOne({ resume: resumeId }).sort({ createdAt: -1 })

        if (!exam) {
            return res.status(404).json({ success: false, message: "No exam records found for candidate" })
        }

        res.json({
            success: true,
            exam
        })
    } catch (error) {
        console.error("Get exam details error:", error)
        res.status(500).json({ success: false, message: "Error fetching exam details" })
    }
}

/**
 * Update Candidate Interview Status
 */
export const updateInterviewStatus = async (req, res) => {
    try {
        const { examId } = req.params
        const { interviewStatus, interviewNotes } = req.body

        const exam = await Exam.findById(examId)
        if (!exam) {
            return res.status(404).json({ success: false, message: "Exam not found" })
        }

        exam.interviewStatus = interviewStatus || exam.interviewStatus
        if (interviewNotes) exam.interviewNotes = interviewNotes
        await exam.save()

        const resume = await Resume.findById(exam.resume)
        if (resume) {
            if (interviewStatus === "passed") {
                resume.hiringStatus = "interview_scheduled"
            } else if (interviewStatus === "failed") {
                resume.hiringStatus = "rejected"
            }
            await resume.save()
        }

        res.json({
            success: true,
            interviewStatus: exam.interviewStatus,
            message: "Interview status updated successfully!"
        })
    } catch (error) {
        console.error("Update interview error:", error)
        res.status(500).json({ success: false, message: "Error updating interview status" })
    }
}

/**
 * Send Selection / Hiring Confirmation Email
 */
export const sendConfirmation = async (req, res) => {
    try {
        const { resumeId } = req.params
        const resume = await Resume.findOne({ _id: resumeId, user: req.user._id })

        if (!resume) {
            return res.status(404).json({ success: false, message: "Resume not found" })
        }

        const recipientEmail = resume.email || req.body.email || "candidate@example.com"

        await sendHiringConfirmationEmail({
            to: recipientEmail,
            candidateName: resume.name || "Candidate",
            roleCategory: resume.roleCategory || "Software Engineer"
        })

        resume.hiringStatus = "hired"
        await resume.save()

        res.json({
            success: true,
            message: `Hiring confirmation email successfully sent to ${recipientEmail}!`
        })
    } catch (error) {
        console.error("Send confirmation email error:", error)
        res.status(500).json({ success: false, message: "Error sending confirmation email" })
    }
}

/**
 * Send / Resend Video Interview Email & Join Link to Candidate
 */
export const sendVideoInterviewInvite = async (req, res) => {
    try {
        const { resumeId } = req.params
        const { candidateEmail, isResend } = req.body

        const resume = await Resume.findOne({ _id: resumeId, user: req.user._id })
        if (!resume) {
            return res.status(404).json({ success: false, message: "Candidate record not found" })
        }

        const emailToSend = candidateEmail?.trim() || resume.email
        if (!emailToSend) {
            return res.status(400).json({ success: false, message: "Candidate email required" })
        }

        resume.email = emailToSend

        let exam = await Exam.findOne({ resume: resume._id }).sort({ createdAt: -1 })
        if (!exam) {
            const token = crypto.randomBytes(24).toString("hex")
            exam = await Exam.create({
                resume: resume._id,
                user: req.user._id,
                candidateEmail: emailToSend,
                candidateName: resume.name || "Candidate",
                token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                questions: [],
                status: "pending"
            })
        }

        const interviewToken = crypto.randomBytes(24).toString("hex")
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // Strict 5 minutes validity

        exam.interviewToken = interviewToken
        exam.interviewExpiresAt = expiresAt
        exam.interviewStatus = "invited"
        await exam.save()

        resume.latestExam = exam._id
        resume.hiringStatus = "interview_scheduled"
        await resume.save()

        const host = req.get("origin") || req.get("referer") || "http://localhost:5173"
        const cleanHost = host.replace(/\/$/, "")
        const interviewLink = `${cleanHost}/interview/${interviewToken}`

        await sendVideoInterviewInviteEmail({
            to: emailToSend,
            candidateName: resume.name || "Candidate",
            interviewLink,
            expiresAt,
            isResend: Boolean(isResend)
        })

        res.json({
            success: true,
            interviewToken,
            interviewLink,
            expiresAt,
            message: isResend 
                ? `Updated 5-minute video interview join link emailed to ${emailToSend}!`
                : `5-Minute Video interview join link emailed to ${emailToSend}! Candidate must join within 5 minutes.`
        })
    } catch (error) {
        console.error("Send video interview invite error:", error)
        res.status(500).json({ success: false, message: "Error sending video interview invite" })
    }
}

/**
 * Verify Interview Token for candidate live interview portal
 */
export const verifyInterviewToken = async (req, res) => {
    try {
        const { token } = req.params
        const exam = await Exam.findOne({ interviewToken: token }).populate("resume")

        if (!exam) {
            return res.status(404).json({ success: false, message: "Invalid or non-existent interview join link." })
        }

        if (exam.interviewExpiresAt && new Date() > new Date(exam.interviewExpiresAt)) {
            return res.status(410).json({
                success: false,
                isExpired: true,
                message: "This interview invitation link has EXPIRED. Please contact HR to request a new join link."
            })
        }

        res.json({
            success: true,
            candidateName: exam.candidateName,
            candidateEmail: exam.candidateEmail,
            roleCategory: exam.resume?.roleCategory || "Software Engineer",
            interviewStatus: exam.interviewStatus,
            expiresAt: exam.interviewExpiresAt
        })
    } catch (error) {
        console.error("Verify interview token error:", error)
        res.status(500).json({ success: false, message: "Error verifying interview join link" })
    }
}

