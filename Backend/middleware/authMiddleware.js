import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const protect = async (req, res, next) => {
    let token

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1]
    } else if (req.query && req.query.token) {
        token = req.query.token
    }

    if (token) {
        try {
            if (!process.env.JWT_SECRET) {
                console.error("Auth Middleware Error: JWT_SECRET environment variable missing")
                return res.status(500).json({
                    success: false,
                    message: "Server configuration error"
                })
            }
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            )

            req.user = await User.findById(decoded.id).select("-password")
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found or authorization revoked"
                })
            }
            return next()
        } catch (error) {
            console.error("Auth Middleware Error:", error)
            return res.status(401).json({
                success: false,
                message: "Not authorized, token failed"
            })
        }
    }

    return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided"
    })
}
