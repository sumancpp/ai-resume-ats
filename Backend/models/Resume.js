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
    }
}, {
    timestamps: true
})

// Index for fast per-user duplicate & folder checking
resumeSchema.index({ user: 1, fileHash: 1 })
resumeSchema.index({ user: 1, folder: 1 })

// Drop legacy global fileHash_1 index if present in MongoDB
Resume.collection.dropIndex("fileHash_1").catch(() => {})

export default Resume