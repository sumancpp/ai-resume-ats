import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String
        },
        googleId: {
            type: String
        },
        avatar: {
            type: String,
            default: ""
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        },
        resetPasswordToken: {
            type: String
        },
        resetPasswordExpires: {
            type: Date
        }
    },
    {
        timestamps: true
    }
)

const User = mongoose.model("User", userSchema)

export default User
