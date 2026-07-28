import mongoose from "mongoose"

const examSchema = new mongoose.Schema({
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resume",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    candidateEmail: {
        type: String,
        required: true
    },
    candidateName: {
        type: String,
        default: "Candidate"
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from creation
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "expired"],
        default: "pending"
    },
    timer: {
        totalMinutes: {
            type: Number,
            default: 10
        },
        startedAt: {
            type: Date
        },
        submittedAt: {
            type: Date
        }
    },
    questions: [
        {
            id: { type: String, required: true },
            type: { type: String, enum: ["mcq", "coding", "text"], required: true },
            questionText: { type: String, required: true },
            options: [{ type: String }],
            correctOptionIndex: { type: Number },
            starterCode: { type: String },
            testCases: [
                {
                    input: { type: String },
                    expectedOutput: { type: String },
                    description: { type: String },
                    hidden: { type: Boolean, default: false }
                }
            ]
        }
    ],
    answers: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    codeSubmissions: [
        {
            questionId: { type: String },
            code: { type: String },
            testResults: [
                {
                    input: String,
                    expected: String,
                    actual: String,
                    passed: Boolean
                }
            ]
        }
    ],
    score: {
        type: Number,
        default: 0
    },
    aiFeedback: {
        type: String,
        default: ""
    },
    interviewStatus: {
        type: String,
        enum: ["none", "scheduled", "invited", "passed", "failed"],
        default: "none"
    },
    interviewToken: {
        type: String,
        default: null
    },
    interviewExpiresAt: {
        type: Date,
        default: null
    },
    interviewNotes: {
        type: String,
        default: ""
    },
    hiringStatus: {
        type: String,
        enum: ["pending", "passed", "rejected"],
        default: "pending"
    }
}, {
    timestamps: true
})

examSchema.index({ candidateEmail: 1 })

const Exam = mongoose.model("Exam", examSchema)
export default Exam
