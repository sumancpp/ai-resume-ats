import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import multer from "multer"
import path from "path"
import crypto from "crypto"
import fs from "fs"

import pdf from "pdf-parse/lib/pdf-parse.js"

import connectDB from "./config/db.js"
import Resume from "./models/Resume.js"
import skills from "./utils/skills.js"
import normalizeText from "./helpers/normalizeText.js"
import { getGeminiModel } from "./ai/gemini.js"
import authRoutes from "./routes/authRoutes.js"
import { protect } from "./middleware/authMiddleware.js"

connectDB()

const app = express()

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://ai-resume-ats-frontend.onrender.com"
    ],
    credentials: true
}))

app.use(express.json())

// =====================
// AUTH ROUTES
// =====================
app.use("/api/auth", authRoutes)

// =====================
// STATIC UPLOADS
// =====================
app.use("/uploads", express.static("uploads"))

// =====================
// CLEAN PDF TEXT
// =====================
const cleanPDFText = (text) => {
    return text
        .replace(/(?:\b[A-Z]\s){2,}[A-Z]\b/g, (match) => match.replace(/\s/g, ""))
        .replace(/(?:\b[a-z]\s){2,}[a-z]\b/g, (match) => match.replace(/\s/g, ""))
        .replace(/\s+/g, " ")
        .replace(/[^\x20-\x7E]/g, " ")
        .trim()
}

// =====================
// STORAGE CONFIG
// =====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/")
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname)
        cb(null, uniqueName)
    }
})

// =====================
// STRICT FILE FILTER (PDF & DOCX ONLY)
// =====================
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]

    const ext = path.extname(file.originalname).toLowerCase()
    const allowedExts = [".pdf", ".docx"]

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true)
    } else {
        cb(new Error("Invalid file format. Only PDF (.pdf) and Word (.docx) resume documents are allowed."), false)
    }
}

const upload = multer({
    storage,
    fileFilter
})

// =====================
// TEST ROUTE
// =====================
app.get("/", (req, res) => {
    res.send("TalentAI ATS Backend Running")
})

// =====================
// MULTIPLE RESUME UPLOAD (USER ISOLATED)
// =====================
app.post(
    "/upload",
    protect,
    upload.array("resumes", 50),
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No files uploaded or invalid document types"
                })
            }

            const uploadedResumes = []
            let duplicatesSkipped = 0

            for (const file of req.files) {
                // Generate file MD5 hash
                const fileBuffer = fs.readFileSync(file.path)
                const fileHash = crypto
                    .createHash("md5")
                    .update(fileBuffer)
                    .digest("hex")

                // Per-User Duplicate Check
                const existingResume = await Resume.findOne({
                    user: req.user._id,
                    fileHash
                })

                if (existingResume) {
                    console.log(`Duplicate resume skipped for user ${req.user._id}: ${file.originalname}`)
                    duplicatesSkipped++
                    continue
                }

                // Parse PDF / text
                let text = ""
                try {
                    const pdfData = await pdf(fileBuffer)
                    text = cleanPDFText(pdfData.text)
                } catch (pdfErr) {
                    console.error("PDF Parsing error:", pdfErr)
                    text = cleanPDFText(fileBuffer.toString("utf-8"))
                }

                // Extract Skills
                const extractedSkills = []
                skills.forEach((skill) => {
                    const normalizedSkill = skill.toLowerCase()
                    const normalizedText = text.toLowerCase()
                    if (normalizedText.includes(normalizedSkill)) {
                        extractedSkills.push(skill)
                    }
                })

                // Extract CGPA
                let cgpa = null
                const cgpaRegex = /(?:CGPA|SGPA|Overall\s*CGPA)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i
                const cgpaMatch = text.match(cgpaRegex)
                if (cgpaMatch) {
                    cgpa = Number(cgpaMatch[1])
                }

                // Extract College
                let college = null
                const collegeRegex = /([A-Za-z\s]+(?:Group of Institutions|University|College|Institute(?: of Technology)?))/i
                const collegeMatch = text.match(collegeRegex)
                if (collegeMatch) {
                    college = collegeMatch[1].replace(/\s+/g, " ").trim()
                }

                // Extract Candidate Name
                let name = null
                const nameMatch = text.match(/^([A-Z\s]{5,40})/)
                if (nameMatch) {
                    name = nameMatch[1].replace(/\s+/g, " ").trim()
                }
                if (!name || name.length < 3) {
                    name = text.split(" ").slice(0, 2).join(" ")
                }

                // AI Summary
                const geminiModel = getGeminiModel()
                const summaryPrompt = `
Analyze this resume and generate a short professional summary.
Rules:
- Maximum 2 lines
- Mention skills and experience
- Plain text only

Resume:
${text}
`
                let summary = ""
                try {
                    const summaryResult = await geminiModel.generateContent(summaryPrompt)
                    summary = summaryResult.response.text().trim()
                } catch (aiError) {
                    summary = "Professional candidate profile."
                }

                const parsedData = {
                    user: req.user._id,
                    name,
                    skills: extractedSkills,
                    cgpa,
                    college,
                    summary,
                    resumeText: text,
                    filePath: file.path,
                    fileHash
                }

                const savedResume = await Resume.create(parsedData)
                uploadedResumes.push(savedResume)
            }

            res.json({
                success: true,
                count: uploadedResumes.length,
                duplicatesSkipped,
                uploadedResumes,
                message: duplicatesSkipped > 0
                    ? `Uploaded ${uploadedResumes.length} new resume(s). ${duplicatesSkipped} duplicate file(s) skipped.`
                    : `Successfully uploaded ${uploadedResumes.length} resume(s).`
            })
        } catch (error) {
            console.error("Upload error:", error)
            res.status(500).json({
                success: false,
                message: error.message || "Upload Error"
            })
        }
    }
)

// =====================
// NORMAL SEARCH (USER ISOLATED)
// =====================
app.get("/search", protect, async (req, res) => {
    try {
        const rawQuery = req.query.query || ""
        const normalizedQuery = normalizeText(rawQuery)

        const userResumes = await Resume.find({ user: req.user._id })

        if (userResumes.length === 0) {
            return res.json({
                success: true,
                count: 0,
                totalUserResumes: 0,
                resumes: [],
                message: "No resumes uploaded yet. Please upload candidate resumes first!"
            })
        }

        const filteredResumes = userResumes.filter((resume) => {
            const searchableText = normalizeText(
                `${resume.name} ${resume.college} ${resume.skills.join(" ")} ${resume.resumeText} ${resume.summary}`
            )
            return searchableText.includes(normalizedQuery)
        })

        res.json({
            success: true,
            count: filteredResumes.length,
            totalUserResumes: userResumes.length,
            resumes: filteredResumes
        })
    } catch (error) {
        console.error("Search error:", error)
        res.status(500).json({
            success: false,
            message: "Search Error"
        })
    }
})

// =====================
// AI SEARCH (USER ISOLATED & GROUNDED)
// =====================
app.get("/ai-search", protect, async (req, res) => {
    try {
        const userQuery = req.query.query?.toLowerCase().trim()

        if (!userQuery) {
            return res.status(400).json({
                success: false,
                message: "Search query required"
            })
        }

        const userResumes = await Resume.find({ user: req.user._id })

        if (userResumes.length === 0) {
            return res.json({
                success: true,
                count: 0,
                totalUserResumes: 0,
                resumes: [],
                message: "No resumes uploaded yet. Please upload candidate resumes first!"
            })
        }

        const scoredResumes = []
        const queryWords = userQuery.split(" ").filter((word) => word.length >= 2)

        for (const resume of userResumes) {
            let score = 0
            let reasons = []

            const searchableText = `
                ${resume.name || ""}
                ${resume.skills.join(" ")}
                ${resume.college || ""}
                ${resume.resumeText || ""}
                ${resume.summary || ""}
            `.toLowerCase()

            let matchedWords = 0

            queryWords.forEach((word) => {
                if (searchableText.includes(word)) {
                    matchedWords++
                    score += 25
                    reasons.push(`"${word}" matched`)
                }
            })

            // Strict filter: Must match at least 1 keyword
            if (matchedWords === 0) {
                continue
            }

            // Skill bonus
            resume.skills.forEach((skill) => {
                if (userQuery.includes(skill.toLowerCase())) {
                    score += 30
                    reasons.push(`${skill} skill matched`)
                }
            })

            // CGPA bonus
            if (resume.cgpa && resume.cgpa >= 7) {
                score += 10
                reasons.push("Good CGPA")
            }

            // Experience bonus
            if (searchableText.includes("intern")) {
                score += 10
                reasons.push("Internship experience")
            }
            if (searchableText.includes("project")) {
                score += 5
                reasons.push("Project experience")
            }

            resume.score = score
            resume.reason = reasons.slice(0, 4).join(", ")

            scoredResumes.push(resume)
        }

        scoredResumes.sort((a, b) => b.score - a.score)

        res.json({
            success: true,
            count: scoredResumes.length,
            totalUserResumes: userResumes.length,
            resumes: scoredResumes
        })
    } catch (error) {
        console.error("AI search error:", error)
        res.status(500).json({
            success: false,
            message: "AI Search Error"
        })
    }
})

// =====================
// USER DASHBOARD STATS
// =====================
app.get("/stats", protect, async (req, res) => {
    try {
        const totalResumes = await Resume.countDocuments({ user: req.user._id })
        const resumes = await Resume.find({ user: req.user._id })

        let totalSkillsCount = 0
        resumes.forEach((r) => {
            totalSkillsCount += r.skills?.length || 0
        })

        res.json({
            success: true,
            totalResumes,
            totalSkillsParsed: totalSkillsCount
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching stats"
        })
    }
})

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
