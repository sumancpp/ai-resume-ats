import mongoose from "mongoose"

const resumeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder",
        default: null
    },

    name: {
        type: String
    },

    skills: [
        {
            type: String
        }
    ],

    cgpa: {
        type: Number
    },

    college: {
        type: String
    },

    summary: {
        type: String
    },

    roleCategory: {
        type: String,
        default: "General"
    },

    resumeText: {
        type: String
    },

    filePath: {
        type: String
    },

    fileHash: {
        type: String
    },

    email: {
        type: String
    },

    isShortlisted: {
        type: Boolean,
        default: false
    },

    latestExam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        default: null
    },

    examStatus: {
        type: String,
        enum: ["none", "invited", "in_progress", "completed", "expired"],
        default: "none"
    },

    examScore: {
        type: Number,
        default: null
    },

    hiringStatus: {
        type: String,
        enum: ["none", "shortlisted", "exam_invited", "exam_completed", "interview_scheduled", "hired", "rejected"],
        default: "none"
    }
}, {
    timestamps: true
})

// Index for fast per-user duplicate & folder checking
resumeSchema.index({ user: 1, fileHash: 1 })
const Resume = mongoose.model("Resume", resumeSchema)

// Safely drop legacy global fileHash_1 index once MongoDB connection opens
mongoose.connection.once("open", async () => {
    try {
        await Resume.collection.dropIndex("fileHash_1")
    } catch (err) {
        // Index already dropped or doesn't exist
    }
})

export default Resume