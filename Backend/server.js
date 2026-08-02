import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import multer from "multer"
import path from "path"
import crypto from "crypto"
import fs from "fs"

import pdf from "pdf-parse/lib/pdf-parse.js"

import mongoose from "mongoose"
import connectDB from "./config/db.js"
import User from "./models/User.js"
import Resume from "./models/Resume.js"
import Folder from "./models/Folder.js"
import skills from "./utils/skills.js"
import normalizeText from "./helpers/normalizeText.js"
import { getGeminiModel } from "./ai/gemini.js"
import authRoutes from "./routes/authRoutes.js"
import examRoutes from "./routes/examRoutes.js"
import { protect } from "./middleware/authMiddleware.js"

connectDB()

const app = express()

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.includes("localhost") || origin.includes("onrender.com")) {
            return callback(null, true)
        }
        return callback(null, true)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}))

app.use(express.json())

// =====================
// AUTH & EXAM ROUTES
// =====================
app.use("/api/auth", authRoutes)
app.use("/api/exams", examRoutes)

// =====================
// STATIC UPLOADS WITH CORS HEADERS
// =====================
app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
    next()
}, express.static(path.resolve("uploads")))

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
// AUTO ROLE CATEGORY DETECTOR
// =====================
const detectRoleCategory = (skillsArray = [], fullText = "") => {
    const text = fullText.toLowerCase()
    const skillsLower = skillsArray.map((s) => s.toLowerCase())

    if (skillsLower.some(s => ["flutter", "react native", "swift", "kotlin", "android", "ios", "mobile"].includes(s)) || text.includes("mobile app") || text.includes("app developer")) {
        return "Mobile App Development"
    }
    if (skillsLower.some(s => ["react", "node.js", "express", "mongodb", "next.js", "vue", "angular", "html", "css", "mern"].includes(s)) || text.includes("full stack") || text.includes("web developer")) {
        return "Web Development"
    }
    if (skillsLower.some(s => ["pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "machine learning", "deep learning", "nlp", "ai"].includes(s))) {
        return "Data Science & AI"
    }
    if (skillsLower.some(s => ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible", "ci/cd", "linux"].includes(s))) {
        return "DevOps & Cloud"
    }
    if (skillsLower.some(s => ["cybersecurity", "ethical hacking", "wireshark", "nmap", "burp suite"].includes(s))) {
        return "Cybersecurity"
    }
    return "Software Engineering"
}

// =====================
// STORAGE CONFIG
// =====================
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true })
}

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
// FOLDER / JOB ROLE POOL API
// =====================
app.get("/folders", protect, async (req, res) => {
    try {
        const folders = await Folder.find({ user: req.user._id }).sort({ createdAt: -1 })
        
        const foldersWithCount = await Promise.all(
            folders.map(async (folder) => {
                const candidateCount = await Resume.countDocuments({ user: req.user._id, folder: folder._id, isDeleted: { $ne: true } })
                return {
                    ...folder.toObject(),
                    candidateCount
                }
            })
        )

        const totalResumes = await Resume.countDocuments({ user: req.user._id, isDeleted: { $ne: true } })
        const unassignedCount = await Resume.countDocuments({ user: req.user._id, folder: null, isDeleted: { $ne: true } })

        res.json({
            success: true,
            totalResumes,
            unassignedCount,
            folders: foldersWithCount
        })
    } catch (error) {
        console.error("Fetch folders error:", error)
        res.status(500).json({ success: false, message: "Error fetching job folders" })
    }
})

// Single Resume Fetch & Soft-Delete API
app.get("/resumes/:id", protect, async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } }).populate("folder", "name color")
        if (!resume) {
            return res.status(404).json({ success: false, message: "Candidate dossier not found" })
        }
        res.json({ success: true, resume })
    } catch (error) {
        console.error("Fetch single resume error:", error)
        res.status(500).json({ success: false, message: "Error fetching resume details" })
    }
})

app.delete("/resumes/:id", protect, async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id })
        if (!resume) {
            return res.status(404).json({ success: false, message: "Resume not found" })
        }
        resume.isDeleted = true
        await resume.save()
        res.json({ success: true, message: "Resume deleted and removed from search results successfully." })
    } catch (error) {
        console.error("Delete resume error:", error)
        res.status(500).json({ success: false, message: "Error removing resume" })
    }
})

app.post("/folders", protect, async (req, res) => {
    try {
        const { name, description, color } = req.body
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Folder name required" })
        }

        const newFolder = await Folder.create({
            user: req.user._id,
            name: name.trim(),
            description: description?.trim() || "",
            color: color || "indigo"
        })

        res.status(201).json({
            success: true,
            folder: { ...newFolder.toObject(), candidateCount: 0 }
        })
    } catch (error) {
        console.error("Create folder error:", error)
        res.status(500).json({ success: false, message: "Error creating job folder" })
    }
})

app.delete("/folders/:id", protect, async (req, res) => {
    try {
        await Folder.findOneAndDelete({ _id: req.params.id, user: req.user._id })
        await Resume.updateMany({ user: req.user._id, folder: req.params.id }, { $set: { folder: null } })
        res.json({ success: true, message: "Job folder deleted successfully" })
    } catch (error) {
        console.error("Delete folder error:", error)
        res.status(500).json({ success: false, message: "Error deleting folder" })
    }
})

// =====================
// MULTIPLE RESUME UPLOAD (WITH FOLDER & ROLE ALLOCATION)
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

            const targetFolderId = req.body.folderId && req.body.folderId !== "all" && req.body.folderId !== "general"
                ? req.body.folderId
                : null

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

                // Extract Skills with Word Boundary Checks
                const extractedSkills = []
                const normalizedText = text.toLowerCase()
                skills.forEach((skill) => {
                    const normSkill = skill.toLowerCase()
                    if (normSkill === "c") {
                        const regex = /(?:^|[^a-zA-Z0-9_#+])c(?:$|[^a-zA-Z0-9_#+])/i
                        if (regex.test(normalizedText)) {
                            extractedSkills.push(skill)
                        }
                    } else if (normSkill === "c++") {
                        const regex = /(?:^|[^a-zA-Z0-9_#+])(?:c\+\+|cpp|cplusplus)(?:$|[^a-zA-Z0-9_#+])/i
                        if (regex.test(normalizedText)) {
                            extractedSkills.push(skill)
                        }
                    } else if (normSkill === "c#") {
                        const regex = /(?:^|[^a-zA-Z0-9_#+])(?:c#|csharp)(?:$|[^a-zA-Z0-9_#+])/i
                        if (regex.test(normalizedText)) {
                            extractedSkills.push(skill)
                        }
                    } else if (normSkill.length <= 3) {
                        const escaped = normSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, "i")
                        if (regex.test(normalizedText)) {
                            extractedSkills.push(skill)
                        }
                    } else {
                        if (normalizedText.includes(normSkill)) {
                            extractedSkills.push(skill)
                        }
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

                // Extract Candidate Email
                let email = null
                const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
                const emailMatches = text.match(emailRegex)
                if (emailMatches && emailMatches.length > 0) {
                    const validEmail = emailMatches.find(e => !e.toLowerCase().includes("example.com") && !e.toLowerCase().includes("sample"))
                    email = (validEmail || emailMatches[0]).toLowerCase().trim()
                }

                // Auto Role Category Detection
                const roleCategory = detectRoleCategory(extractedSkills, text)

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
                    folder: targetFolderId,
                    roleCategory,
                    name,
                    email,
                    skills: extractedSkills,
                    cgpa,
                    college,
                    summary,
                    resumeText: text,
                    filePath: file.path ? file.path.replace(/\\/g, "/") : "",
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
// NORMAL SEARCH (USER & FOLDER ISOLATED)
// =====================
app.get("/search", protect, async (req, res) => {
    try {
        const rawQuery = req.query.query || ""
        const folderId = req.query.folderId
        const normalizedQuery = normalizeText(rawQuery)

        const filter = { user: req.user._id, isDeleted: { $ne: true } }
        if (folderId && folderId !== "all" && folderId !== "general" && mongoose.Types.ObjectId.isValid(folderId)) {
            filter.folder = folderId
        } else if (folderId === "general") {
            filter.folder = null
        }

        const userResumes = await Resume.find(filter).populate("folder", "name color")

        if (userResumes.length === 0) {
            return res.json({
                success: true,
                count: 0,
                totalUserResumes: 0,
                resumes: [],
                message: "No resumes found in this job folder!"
            })
        }

        const filteredResumes = userResumes.filter((resume) => {
            const searchableText = normalizeText(
                `${resume.name} ${resume.college} ${resume.skills.join(" ")} ${resume.resumeText} ${resume.summary} ${resume.roleCategory}`
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
// STOP WORDS & WORD MATCHING UTILITY
// =====================
const STOP_WORDS = new Set([
    "with", "in", "for", "and", "or", "of", "to", "a", "an", "the",
    "proficient", "experience", "skills", "developer", "engineer",
    "working", "knowledge", "strong", "good", "etc", "looking", "candidate",
    "role", "position", "having", "who", "has", "is", "are", "at", "by", "from",
    "specialist", "analyst", "full", "stack", "general"
])

const checkKeywordMatch = (text, keyword) => {
    if (!text || !keyword) return false
    const normText = text.toLowerCase()
    const normKey = keyword.toLowerCase().trim()

    if (normKey === "c") {
        const regex = /(?:^|[^a-zA-Z0-9_#+])c(?:$|[^a-zA-Z0-9_#+])/i
        return regex.test(normText)
    }

    if (normKey === "c++" || normKey === "cpp") {
        const regex = /(?:^|[^a-zA-Z0-9_#+])(?:c\+\+|cpp|cplusplus)(?:$|[^a-zA-Z0-9_#+])/i
        return regex.test(normText)
    }

    if (normKey === "c#" || normKey === "csharp") {
        const regex = /(?:^|[^a-zA-Z0-9_#+])(?:c#|csharp)(?:$|[^a-zA-Z0-9_#+])/i
        return regex.test(normText)
    }

    if (normKey.length <= 3) {
        const escaped = normKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, "i")
        return regex.test(normText)
    }

    return normText.includes(normKey)
}

// =====================
// AI SEARCH (PRECISION SKILLS & ATS MATCHING ENGINE)
// =====================
app.get("/ai-search", protect, async (req, res) => {
    try {
        const rawUserQuery = req.query.query || ""
        const folderId = req.query.folderId
        const userQueryLower = rawUserQuery.toLowerCase().trim()

        if (!userQueryLower) {
            return res.status(400).json({
                success: false,
                message: "Search query required"
            })
        }

        const filter = { user: req.user._id, isDeleted: { $ne: true } }
        if (folderId && folderId !== "all" && folderId !== "general" && mongoose.Types.ObjectId.isValid(folderId)) {
            filter.folder = folderId
        } else if (folderId === "general") {
            filter.folder = null
        }

        const userResumes = await Resume.find(filter).populate("folder", "name color")

        if (userResumes.length === 0) {
            return res.json({
                success: true,
                count: 0,
                totalUserResumes: 0,
                resumes: [],
                message: "No candidate resumes found in this job folder!"
            })
        }

        // Extract key technical tokens from query (preserving C, C++, C#, .NET)
        const rawTokens = userQueryLower.split(/[\s,;&/]+/)
        const queryTechKeywords = rawTokens.filter((token) => token.length >= 1 && !STOP_WORDS.has(token))

        const scoredResumes = []

        for (const resume of userResumes) {
            let score = 0
            let reasons = []
            let matchedKeywordsCount = 0

            const candidateSkills = (resume.skills || []).map((s) => s.toLowerCase())
            const fullTextLower = `
                ${resume.name || ""}
                ${candidateSkills.join(" ")}
                ${resume.college || ""}
                ${resume.resumeText || ""}
                ${resume.summary || ""}
                ${resume.roleCategory || ""}
            `.toLowerCase()

            // 1. Technical Keyword Evaluation
            queryTechKeywords.forEach((keyword) => {
                const matchedInSkills = candidateSkills.some((skill) => checkKeywordMatch(skill, keyword))
                const matchedInText = checkKeywordMatch(fullTextLower, keyword)

                if (matchedInSkills) {
                    matchedKeywordsCount++
                    score += 50
                    reasons.push(`${keyword.toUpperCase()} skill match`)
                } else if (matchedInText) {
                    matchedKeywordsCount++
                    score += 30
                    reasons.push(`"${keyword}" mentioned in CV`)
                }
            })

            // STRICT FILTER: If user searched for technical keywords, candidate MUST match AT LEAST 1 keyword!
            if (queryTechKeywords.length > 0 && matchedKeywordsCount === 0) {
                continue // Exclude candidates with 0 matching terms
            }

            // 2. Exact Multi-word Phrase Match Bonus
            const exactPhrases = [
                "full stack", "machine learning", "data science", "rest api", "cloud computing",
                "ui/ux", "fastapi", "pytorch", "node.js", "express.js", "mongodb", "react native"
            ]
            exactPhrases.forEach((phrase) => {
                if (userQueryLower.includes(phrase) && checkKeywordMatch(fullTextLower, phrase)) {
                    score += 35
                    reasons.push(`Exact "${phrase}" phrase match`)
                }
            })

            // 3. Academic CGPA Bonus
            if (resume.cgpa && resume.cgpa >= 8.0) {
                score += 10
                reasons.push(`High CGPA (${resume.cgpa})`)
            }

            // 4. Role Category Bonus
            if (resume.roleCategory && userQueryLower.includes(resume.roleCategory.toLowerCase())) {
                score += 20
                reasons.push(`${resume.roleCategory} category match`)
            }

            resume.score = score > 0 ? score : 50
            resume.reason = Array.from(new Set(reasons)).slice(0, 4).join(" | ") || "Matched candidate profile"

            scoredResumes.push(resume)
        }

        // Sort candidate matches by score descending
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
        const totalFolders = await Folder.countDocuments({ user: req.user._id })
        const resumes = await Resume.find({ user: req.user._id })

        let totalSkillsCount = 0
        resumes.forEach((r) => {
            totalSkillsCount += r.skills?.length || 0
        })

        res.json({
            success: true,
            totalResumes,
            totalFolders,
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
// WEBRTC SIGNALING & SOCKET.IO SERVER
// =====================
import http from "http"
import { Server } from "socket.io"

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

io.on("connection", (socket) => {
    console.log("WebRTC Socket connected:", socket.id)

    socket.on("join-interview-room", ({ roomId, userRole, userName }) => {
        socket.join(roomId)
        console.log(`[Interview Room ${roomId}] ${userName} (${userRole}) connected`)
        socket.to(roomId).emit("user-joined", { socketId: socket.id, userRole, userName })
    })

    socket.on("webrtc-offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("webrtc-offer", { offer, senderId: socket.id })
    })

    socket.on("webrtc-answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("webrtc-answer", { answer, senderId: socket.id })
    })

    socket.on("ice-candidate", ({ roomId, candidate }) => {
        socket.to(roomId).emit("ice-candidate", { candidate, senderId: socket.id })
    })

    socket.on("screen-share-status", ({ roomId, isSharing, userRole }) => {
        socket.to(roomId).emit("screen-share-status", { isSharing, userRole, senderId: socket.id })
    })

    socket.on("leave-interview-room", ({ roomId }) => {
        socket.leave(roomId)
        socket.to(roomId).emit("user-left", { socketId: socket.id })
    })

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id)
    })
})

// =====================
// START SERVER WITH SOCKET.IO
// =====================
const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
    console.log(`Server & WebRTC Socket.io running on port ${PORT}`)
})
