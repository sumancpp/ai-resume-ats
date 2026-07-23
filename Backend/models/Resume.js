import mongoose from "mongoose"

const resumeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
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

    resumeText: {
        type: String
    },

    filePath: {
        type: String
    },

    fileHash: {
        type: String
    }
}, {
    timestamps: true
})

// Index for fast per-user duplicate checking
resumeSchema.index({ user: 1, fileHash: 1 })

const Resume = mongoose.model("Resume", resumeSchema)

export default Resume