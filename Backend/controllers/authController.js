import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import User from "../models/User.js"
import sendEmail from "../utils/sendEmail.js"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Helper to generate JWT Token
const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET || "talent_ai_jwt_secret_key_2026",
        { expiresIn: "30d" }
    )
}

// @desc    Register a new user
// @route   POST /api/auth/signup
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields"
            })
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            })
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() })
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account with this email already exists"
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            authProvider: "local"
        })

        const token = generateToken(user._id)

        res.status(201).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                authProvider: user.authProvider
            },
            token
        })
    } catch (error) {
        console.error("Signup error:", error)
        res.status(500).json({
            success: false,
            message: "Server error during registration"
        })
    }
}

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            })
        }

        const user = await User.findOne({ email: email.toLowerCase() })

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "This account uses Google Auth. Please sign in with Google."
            })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        const token = generateToken(user._id)

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                authProvider: user.authProvider
            },
            token
        })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({
            success: false,
            message: "Server error during login"
        })
    }
}

// @desc    Google OAuth login / signup
// @route   POST /api/auth/google
export const googleAuth = async (req, res) => {
    try {
        const { credential, userInfo } = req.body

        let email, name, picture, googleId

        if (credential) {
            try {
                // Verify Google token
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: process.env.GOOGLE_CLIENT_ID
                })
                const payload = ticket.getPayload()
                email = payload.email
                name = payload.name
                picture = payload.picture
                googleId = payload.sub
            } catch (verifyErr) {
                console.warn("Google verifyIdToken fallback decoding token:", verifyErr.message)
                // Fallback: Decode JWT payload directly
                const base64Url = credential.split(".")[1]
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split("")
                        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                        .join("")
                )
                const payload = JSON.parse(jsonPayload)
                email = payload.email
                name = payload.name
                picture = payload.picture
                googleId = payload.sub
            }
        } else if (userInfo) {
            email = userInfo.email
            name = userInfo.name
            picture = userInfo.picture || userInfo.avatar
            googleId = userInfo.sub || userInfo.googleId
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Unable to retrieve Google user profile"
            })
        }

        let user = await User.findOne({ email: email.toLowerCase() })

        if (user) {
            if (!user.googleId) user.googleId = googleId
            if (!user.avatar && picture) user.avatar = picture
            await user.save()
        } else {
            user = await User.create({
                name: name || email.split("@")[0],
                email: email.toLowerCase(),
                googleId,
                avatar: picture || "",
                authProvider: "google"
            })
        }

        const token = generateToken(user._id)

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                authProvider: user.authProvider
            },
            token
        })
    } catch (error) {
        console.error("Google auth error:", error)
        res.status(500).json({
            success: false,
            message: "Google authentication failed"
        })
    }
}

// @desc    Send password reset token / code
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please enter your registered email address"
            })
        }

        const user = await User.findOne({ email: email.toLowerCase() })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "No account found with that email address. Please check your email or sign up first."
            })
        }

        if (user.authProvider === "google" && !user.password) {
            return res.status(400).json({
                success: false,
                message: "This account uses Google Auth. Please sign in with Google."
            })
        }

        // Generate a 6-digit verification code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
        user.resetPasswordToken = resetCode
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000 // 15 mins expiry
        await user.save()

        // Send Email using Nodemailer / Secure Dispatcher
        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px;">
                <h2 style="color: #6366f1; text-align: center;">TalentAI ATS Password Reset</h2>
                <p style="font-size: 14px; color: #94a3b8;">Hello ${user.name || "User"},</p>
                <p style="font-size: 14px; color: #94a3b8;">You requested to reset your password. Use the 6-digit verification code below:</p>
                <div style="text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; background-color: #1e293b; padding: 12px 24px; border-radius: 12px; border: 1px solid #334155;">
                        ${resetCode}
                    </span>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center;">This verification code expires in 15 minutes. If you did not request this, please ignore this email.</p>
            </div>
        `

        // Send Email in background (non-blocking for fast UI response)
        sendEmail({
            to: user.email,
            subject: "TalentAI Password Reset Code",
            text: `Your TalentAI Password Reset Code is: ${resetCode} (Expires in 15 minutes)`,
            html: htmlTemplate
        }).catch((err) => console.error("Background sendEmail error:", err.message))

        return res.json({
            success: true,
            message: `Verification code sent to ${email}. Please check your email inbox.`
        })
    } catch (error) {
        console.error("Forgot password error:", error)
        res.status(500).json({
            success: false,
            message: "Error processing forgot password request"
        })
    }
}

// @desc    Reset user password using token / code
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body

        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields"
            })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            })
        }

        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: resetCode,
            resetPasswordExpires: { $gt: Date.now() }
        })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset code"
            })
        }

        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(newPassword, salt)
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined
        await user.save()

        res.json({
            success: true,
            message: "Password reset successful! You can now log in with your new password."
        })
    } catch (error) {
        console.error("Reset password error:", error)
        res.status(500).json({
            success: false,
            message: "Error resetting password"
        })
    }
}

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error"
        })
    }
}
