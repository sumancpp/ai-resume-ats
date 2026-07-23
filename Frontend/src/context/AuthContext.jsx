import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return `${import.meta.env.VITE_API_URL}/api/auth`
    }
    return window.location.hostname === "localhost"
        ? "http://localhost:5000/api/auth"
        : "https://ai-resume-atsp-backend.onrender.com/api/auth"
}

const API_BASE_URL = getApiBaseUrl()
const FALLBACK_API_BASE_URL = "https://ai-resume-atsp-backend.onrender.com/api/auth"

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem("talent_ai_token") || "")
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState("")

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
            localStorage.setItem("talent_ai_token", token)
            fetchCurrentUser()
        } else {
            delete axios.defaults.headers.common["Authorization"]
            localStorage.removeItem("talent_ai_token")
            setUser(null)
            setLoading(false)
        }
    }, [token])

    const fetchCurrentUser = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/me`)
            if (response.data.success) {
                setUser(response.data.user)
            }
        } catch (err) {
            // If local backend is down, try fallback production backend
            try {
                const fbRes = await axios.get(`${FALLBACK_API_BASE_URL}/me`)
                if (fbRes.data.success) {
                    setUser(fbRes.data.user)
                    return
                }
            } catch (fbErr) {
                console.error("Failed to fetch current user:", fbErr)
            }
            logout()
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        setAuthError("")
        try {
            const res = await axios.post(`${API_BASE_URL}/login`, { email, password })
            if (res.data.success) {
                setToken(res.data.token)
                setUser(res.data.user)
                return { success: true }
            }
        } catch (err) {
            // Try production fallback backend if local connection refused
            if (!err.response && API_BASE_URL !== FALLBACK_API_BASE_URL) {
                try {
                    const fbRes = await axios.post(`${FALLBACK_API_BASE_URL}/login`, { email, password })
                    if (fbRes.data.success) {
                        setToken(fbRes.data.token)
                        setUser(fbRes.data.user)
                        return { success: true }
                    }
                } catch (fbErr) {
                    const msg = fbErr.response?.data?.message || "Login failed. Please check credentials or backend connection."
                    setAuthError(msg)
                    return { success: false, message: msg }
                }
            }
            const msg = err.response?.data?.message || "Login failed. Please check your credentials."
            setAuthError(msg)
            return { success: false, message: msg }
        }
    }

    const signup = async (name, email, password) => {
        setAuthError("")
        try {
            const res = await axios.post(`${API_BASE_URL}/signup`, { name, email, password })
            if (res.data.success) {
                setToken(res.data.token)
                setUser(res.data.user)
                return { success: true }
            }
        } catch (err) {
            if (!err.response && API_BASE_URL !== FALLBACK_API_BASE_URL) {
                try {
                    const fbRes = await axios.post(`${FALLBACK_API_BASE_URL}/signup`, { name, email, password })
                    if (fbRes.data.success) {
                        setToken(fbRes.data.token)
                        setUser(fbRes.data.user)
                        return { success: true }
                    }
                } catch (fbErr) {
                    const msg = fbErr.response?.data?.message || "Registration failed."
                    setAuthError(msg)
                    return { success: false, message: msg }
                }
            }
            const msg = err.response?.data?.message || "Registration failed."
            setAuthError(msg)
            return { success: false, message: msg }
        }
    }

    const googleLogin = async (credentialOrUserInfo) => {
        setAuthError("")
        const payload = typeof credentialOrUserInfo === "string" 
            ? { credential: credentialOrUserInfo } 
            : { userInfo: credentialOrUserInfo }

        try {
            const res = await axios.post(`${API_BASE_URL}/google`, payload)
            if (res.data.success) {
                setToken(res.data.token)
                setUser(res.data.user)
                return { success: true }
            }
        } catch (err) {
            if (!err.response && API_BASE_URL !== FALLBACK_API_BASE_URL) {
                try {
                    const fbRes = await axios.post(`${FALLBACK_API_BASE_URL}/google`, payload)
                    if (fbRes.data.success) {
                        setToken(fbRes.data.token)
                        setUser(fbRes.data.user)
                        return { success: true }
                    }
                } catch (fbErr) {
                    const msg = fbErr.response?.data?.message || "Google authentication failed."
                    setAuthError(msg)
                    return { success: false, message: msg }
                }
            }
            const msg = err.response?.data?.message || "Google authentication failed."
            setAuthError(msg)
            return { success: false, message: msg }
        }
    }

    const logout = () => {
        setToken("")
        setUser(null)
        localStorage.removeItem("talent_ai_token")
        delete axios.defaults.headers.common["Authorization"]
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                authError,
                login,
                signup,
                googleLogin,
                logout,
                setAuthError
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
