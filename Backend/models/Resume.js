import mongoose from "mongoose"

const resumeSchema = new mongoose.Schema({

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
    type: String,
    unique: true
    }

}, {
    timestamps: true
})

const Resume = mongoose.model("Resume", resumeSchema)

export default Resume