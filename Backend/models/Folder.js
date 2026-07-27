import mongoose from "mongoose"

const folderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        color: {
            type: String,
            default: "indigo"
        }
    },
    {
        timestamps: true
    }
)

// Index for fast user folder lookups
folderSchema.index({ user: 1, name: 1 })

const Folder = mongoose.model("Folder", folderSchema)

export default Folder
