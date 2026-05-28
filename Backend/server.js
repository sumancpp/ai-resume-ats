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
// STATIC UPLOADS
// =====================

app.use("/uploads", express.static("uploads"))

// =====================
// CLEAN PDF TEXT
// =====================

const cleanPDFText = (text) => {

    return text

        // FIX SPACED CAPITAL WORDS
        .replace(
            /(?:\b[A-Z]\s){2,}[A-Z]\b/g,
            (match) => match.replace(/\s/g, "")
        )

        // FIX SPACED SMALL WORDS
        .replace(
            /(?:\b[a-z]\s){2,}[a-z]\b/g,
            (match) => match.replace(/\s/g, "")
        )

        // REMOVE MULTIPLE SPACES
        .replace(/\s+/g, " ")

        // REMOVE WEIRD CHARACTERS
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

        const uniqueName =
            Date.now() +
            path.extname(file.originalname)

        cb(null, uniqueName)
    }
})

// =====================
// FILE FILTER
// =====================

const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        "application/pdf",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]

    if (
        allowedTypes.includes(file.mimetype)
    ) {

        cb(null, true)

    } else {

        cb(
            new Error(
                "Only PDF and DOCX allowed"
            ),
            false
        )
    }
}

// =====================
// MULTER
// =====================

const upload = multer({
    storage,
    fileFilter
})

// =====================
// TEST ROUTE
// =====================

app.get("/", (req, res) => {

    res.send("Backend Running")
})

// =====================
// MULTIPLE RESUME UPLOAD
// =====================

app.post(
    "/upload",
    upload.array("resumes", 50),

    async (req, res) => {

        try {

            const uploadedResumes = []

            for (const file of req.files) {

                // =====================
                // FILE HASH
                // =====================

                const fileBuffer =
                    fs.readFileSync(file.path)

                const fileHash =
                    crypto
                        .createHash("md5")
                        .update(fileBuffer)
                        .digest("hex")

                console.log("FILE HASH:")
                console.log(fileHash)

                // =====================
                // CHECK DUPLICATE
                // =====================

                const existingResume =
                    await Resume.findOne({
                        fileHash
                    })

                if (existingResume) {

                    console.log(
                        "DUPLICATE RESUME FOUND"
                    )

                    continue
                }

                // =====================
                // READ PDF
                // =====================

                const dataBuffer =
                    fs.readFileSync(file.path)

                const pdfData =
                    await pdf(dataBuffer)

                let text =
                    pdfData.text

                // =====================
                // CLEAN TEXT
                // =====================

                text =
                    cleanPDFText(text)

                console.log("CLEANED TEXT:")
                console.log(text)

                // =====================
                // EXTRACT SKILLS
                // =====================

                const extractedSkills = []

                skills.forEach((skill) => {

                    const normalizedSkill =
                        skill.toLowerCase()

                    const normalizedText =
                        text.toLowerCase()

                    if (
                        normalizedText.includes(
                            normalizedSkill
                        )
                    ) {

                        extractedSkills.push(skill)
                    }
                })

                console.log("SKILLS:")
                console.log(extractedSkills)

                // =====================
                // EXTRACT CGPA
                // =====================

                let cgpa = null

                const cgpaRegex =
                    /(?:CGPA|SGPA|Overall\s*CGPA|Overall\s*CGPA\s*till\s*\d+\w*\s*sem)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i

                const cgpaMatch =
                    text.match(cgpaRegex)

                if (cgpaMatch) {

                    cgpa =
                        Number(cgpaMatch[1])
                }

                console.log("CGPA:")
                console.log(cgpa)

                // =====================
                // EXTRACT COLLEGE
                // =====================

                let college = null

                const collegeRegex =
                    /([A-Za-z\s]+(?:Group of Institutions|University|College|Institute(?: of Technology)?))/i

                const collegeMatch =
                    text.match(collegeRegex)

                if (collegeMatch) {

                    college =
                        collegeMatch[1]
                            .replace(/\s+/g, " ")
                            .trim()
                }

                console.log("COLLEGE:")
                console.log(college)

                // =====================
                // EXTRACT NAME
                // =====================

                let name = null

                const nameMatch =
                    text.match(
                        /^([A-Z\s]{5,40})/
                    )

                if (nameMatch) {

                    name =
                        nameMatch[1]
                            .replace(/\s+/g, " ")
                            .trim()
                }

                // FALLBACK

                if (
                    !name ||
                    name.length < 3
                ) {

                    name =
                        text
                            .split(" ")
                            .slice(0, 2)
                            .join(" ")
                }

                console.log("NAME:")
                console.log(name)

                // =====================
                // AI SUMMARY
                // =====================

                const geminiModel =
                    getGeminiModel()

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

                    const summaryResult =
                        await geminiModel.generateContent(
                            summaryPrompt
                        )

                    summary =
                        summaryResult.response
                            .text()
                            .trim()

                } catch (aiError) {

                    console.log(
                        "AI SUMMARY ERROR:"
                    )

                    console.log(aiError)

                    summary =
                        "Professional candidate profile."
                }

                // =====================
                // FINAL DATA
                // =====================

                const parsedData = {

                    name,

                    skills: extractedSkills,

                    cgpa,

                    college,

                    summary,

                    resumeText: text,

                    filePath: file.path,

                    fileHash
                }

                console.log("FINAL DATA:")
                console.log(parsedData)

                // =====================
                // SAVE TO DATABASE
                // =====================

                const savedResume =
                    await Resume.create(
                        parsedData
                    )

                uploadedResumes.push(
                    savedResume
                )
            }

            res.json({

                success: true,

                count: uploadedResumes.length,

                uploadedResumes
            })

        } catch (error) {

            console.log(error)

            res.status(500).json({

                success: false,

                message: "Upload Error"
            })
        }
    }
)

// =====================
// NORMAL SEARCH
// =====================

app.get(
    "/search",

    async (req, res) => {

        try {

            const rawQuery =
                req.query.query || ""

            const normalizedQuery =
                normalizeText(rawQuery)

            const resumes =
                await Resume.find()

            const filteredResumes =
                resumes.filter((resume) => {

                    const searchableText =
                        normalizeText(
                            `
                            ${resume.name}
                            ${resume.college}
                            ${resume.skills.join(" ")}
                            ${resume.resumeText}
                            ${resume.summary}
                            `
                        )

                    return searchableText
                        .includes(
                            normalizedQuery
                        )
                })

            res.json({

                success: true,

                count:
                    filteredResumes.length,

                resumes:
                    filteredResumes
            })

        } catch (error) {

            console.log(error)

            res.status(500).json({

                success: false,

                message:
                    "Search Error"
            })
        }
    }
)


// =====================
// AI SEARCH (SMART ATS SEARCH)
// =====================

app.get(
    "/ai-search",

    async (req, res) => {

        try {

            const userQuery =
                req.query.query
                    ?.toLowerCase()
                    .trim()

            if (!userQuery) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Search query required"
                    })
            }

            const resumes =
                await Resume.find()

            const scoredResumes = []

            // =====================
            // QUERY WORDS
            // =====================

            const queryWords =
                userQuery
                    .split(" ")
                    .filter(word => word)

            for (const resume of resumes) {

                let score = 0

                let reasons = []

                // =====================
                // SEARCHABLE TEXT
                // =====================

                const searchableText = `
                ${resume.name || ""}
                ${resume.skills.join(" ")}
                ${resume.college || ""}
                ${resume.resumeText || ""}
                ${resume.summary || ""}
                `
                    .toLowerCase()

                // =====================
                // MATCHED WORDS
                // =====================

                let matchedWords = 0

                queryWords.forEach((word) => {

                    // SKIP SMALL WORDS

                    if (
                        word.length < 2
                    ) {
                        return
                    }

                    // WORD MATCH

                    if (
                        searchableText.includes(word)
                    ) {

                        matchedWords++

                        score += 25

                        reasons.push(
                            `"${word}" matched`
                        )
                    }
                })

                // =====================
                // STRICT FILTER
                // =====================

                if (matchedWords === 0) {

                    continue
                }

                // =====================
                // SKILL BONUS
                // =====================

                resume.skills.forEach((skill) => {

                    if (
                        userQuery.includes(
                            skill.toLowerCase()
                        )
                    ) {

                        score += 30

                        reasons.push(
                            `${skill} skill matched`
                        )
                    }
                })

                // =====================
                // HIGH CGPA BONUS
                // =====================

                if (
                    resume.cgpa &&
                    resume.cgpa >= 7
                ) {

                    score += 10

                    reasons.push(
                        "Good CGPA"
                    )
                }

                // =====================
                // INTERNSHIP BONUS
                // =====================

                if (
                    searchableText.includes(
                        "intern"
                    )
                ) {

                    score += 10

                    reasons.push(
                        "Internship experience"
                    )
                }

                // =====================
                // PROJECT BONUS
                // =====================

                if (
                    searchableText.includes(
                        "project"
                    )
                ) {

                    score += 5

                    reasons.push(
                        "Project experience"
                    )
                }

                // =====================
                // EXACT NAME BONUS
                // =====================

                if (
                    resume.name &&
                    userQuery.includes(
                        resume.name.toLowerCase()
                    )
                ) {

                    score += 50

                    reasons.push(
                        "Exact name matched"
                    )
                }

                // =====================
                // COLLEGE BONUS
                // =====================

                if (
                    resume.college &&
                    userQuery.includes(
                        resume.college.toLowerCase()
                    )
                ) {

                    score += 40

                    reasons.push(
                        "College matched"
                    )
                }

                // =====================
                // FINAL RESULT
                // =====================

                resume.score =
                    score

                resume.reason =
                    reasons
                        .slice(0, 4)
                        .join(", ")

                scoredResumes.push(
                    resume
                )
            }

            // =====================
            // SORT RESULTS
            // =====================

            scoredResumes.sort(
                (a, b) =>
                    b.score - a.score
            )

            res.json({

                success: true,

                count:
                    scoredResumes.length,

                resumes:
                    scoredResumes
            })

        } catch (error) {

            console.log(error)

            res.status(500).json({

                success: false,

                message:
                    "AI Search Error"
            })
        }
    }
)




// =====================
// START SERVER
// =====================

const PORT = 5000

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    )
})
