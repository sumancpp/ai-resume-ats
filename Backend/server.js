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
    origin: (origin, callback) => {
        // Allow requests from localhost, render domains, or no-origin (Postman/Curl)
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
// TECH KNOWLEDGE CLUSTERS & DOMAIN MATRIX
// =====================
const TECH_CLUSTERS = {
    python: ["python", "python3", "py", "fastapi", "django", "flask", "pytorch", "tensorflow", "keras", "pandas", "numpy", "scikit-learn", "scikit"],
    ml: ["machine learning", "ml", "deep learning", "pytorch", "tensorflow", "keras", "pandas", "numpy", "scikit-learn", "nlp", "opencv", "ai", "artificial intelligence", "data science"],
    frontend: ["react", "reactjs", "react.js", "vue", "vuejs", "angular", "nextjs", "next.js", "html", "css", "javascript", "typescript", "tailwind", "bootstrap", "ui/ux", "frontend"],
    backend: ["node", "nodejs", "node.js", "express", "expressjs", "express.js", "python", "django", "fastapi", "java", "spring", "springboot", "golang", "go", "php", "laravel", "c#", ".net", "backend"],
    fullstack: ["full stack", "fullstack", "mern", "mean", "node", "nodejs", "node.js", "express", "expressjs", "mongodb", "react", "reactjs", "nextjs", "vue", "angular"],
    database: ["mongodb", "postgresql", "postgres", "mysql", "sqlite", "sqlite3", "redis", "sql", "nosql", "database"],
    devops: ["docker", "kubernetes", "k8s", "aws", "azure", "gcp", "ci/cd", "terraform", "ansible", "linux", "bash", "devops"],
    cybersecurity: ["cybersecurity", "security", "ethical hacking", "penetration testing", "wireshark", "nmap", "burp suite", "metasploit", "kali linux"]
}

const STOP_WORDS = new Set([
    "with", "in", "for", "and", "or", "of", "to", "a", "an", "the",
    "proficient", "experience", "skills", "developer", "engineer",
    "working", "knowledge", "strong", "good", "etc", "looking", "candidate",
    "role", "position", "having", "who", "has", "is", "are", "at", "by", "from"
])

// =====================
// AI SEARCH (DOMAIN-INTELLIGENT ATS SEARCH ENGINE)
// =====================
app.get("/ai-search", protect, async (req, res) => {
    try {
        const rawUserQuery = req.query.query || ""
        const userQueryLower = rawUserQuery.toLowerCase().trim()

        if (!userQueryLower) {
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

        // Identify which Domain Clusters the query is asking for
        const targetClusters = []
        Object.keys(TECH_CLUSTERS).forEach((clusterKey) => {
            const clusterTerms = TECH_CLUSTERS[clusterKey]
            const isClusterRequested = clusterTerms.some((term) => userQueryLower.includes(term))
            if (isClusterRequested) {
                targetClusters.push(clusterKey)
            }
        })

        // Extract raw query words minus Stop Words
        const rawTokens = userQueryLower.split(/[\s,;&+/]+/)
        const queryTechKeywords = rawTokens.filter((token) => token.length >= 2 && !STOP_WORDS.has(token))

        const scoredResumes = []

        for (const resume of userResumes) {
            let score = 0
            let reasons = []

            const resumeSkillsLower = (resume.skills || []).map((s) => s.toLowerCase())
            const fullTextLower = `
                ${resume.name || ""}
                ${resume.skills.join(" ")}
                ${resume.college || ""}
                ${resume.resumeText || ""}
                ${resume.summary || ""}
            `.toLowerCase()

            // 1. STRICT DOMAIN CLUSTER GUARD:
            // If the query asks for specific domains (e.g. Python, ML, Fullstack, Frontend, Cybersecurity),
            // candidate MUST match at least 1 technology from the requested domain cluster!
            let domainSatisfied = targetClusters.length === 0

            targetClusters.forEach((clusterKey) => {
                const terms = TECH_CLUSTERS[clusterKey]
                const candidateHasClusterTech = terms.some((term) => {
                    return resumeSkillsLower.some((s) => s.includes(term) || term.includes(s)) || fullTextLower.includes(term)
                })

                if (candidateHasClusterTech) {
                    domainSatisfied = true
                    score += 40
                    reasons.push(`${clusterKey.toUpperCase()} domain alignment`)
                }
            })

            if (!domainSatisfied) {
                continue // REJECT CANDIDATE
            }

            // 2. KEYWORD RELEVANCE SCORING
            let matchedKeywordsCount = 0
            queryTechKeywords.forEach((keyword) => {
                let matchedInSkills = false
                let matchedInText = false

                resumeSkillsLower.forEach((skill) => {
                    if (skill.includes(keyword) || keyword.includes(skill)) {
                        matchedInSkills = true
                    }
                })

                if (fullTextLower.includes(keyword)) {
                    matchedInText = true
                }

                if (matchedInSkills) {
                    matchedKeywordsCount++
                    score += 45
                    reasons.push(`${keyword.toUpperCase()} skill`)
                } else if (matchedInText) {
                    matchedKeywordsCount++
                    score += 25
                    reasons.push(`"${keyword}" in resume`)
                }
            })

            // Reject if query contains technical terms and candidate matches 0
            if (queryTechKeywords.length > 0 && matchedKeywordsCount === 0 && targetClusters.length === 0) {
                continue
            }

            // 3. EXACT PHRASE BONUSES
            const exactPhrases = ["full stack", "machine learning", "data science", "rest api", "cloud computing", "ui/ux", "fastapi", "pytorch", "node.js", "express.js", "mongodb"]
            exactPhrases.forEach((phrase) => {
                if (userQueryLower.includes(phrase) && fullTextLower.includes(phrase)) {
                    score += 35
                    reasons.push(`Exact "${phrase}" match`)
                }
            })

            // 4. CGPA & EXPERIENCE BONUSES
            if (resume.cgpa && resume.cgpa >= 8.0) {
                score += 15
                reasons.push(`High Academic CGPA (${resume.cgpa})`)
            }

            if (userQueryLower.includes("intern") && fullTextLower.includes("intern")) {
                score += 15
                reasons.push("Internship experience")
            }

            resume.score = score
            resume.reason = Array.from(new Set(reasons)).slice(0, 4).join(" | ")

            scoredResumes.push(resume)
        }

        // Sort candidates by match score descending
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
