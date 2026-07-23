import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

const API_BASE_URL = "http://localhost:5000/api/auth"

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
            console.error("Failed to fetch current user:", err)
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
            const msg = err.response?.data?.message || "Registration failed."
            setAuthError(msg)
            return { success: false, message: msg }
        }
    }

    const googleLogin = async (credentialOrUserInfo) => {
        setAuthError("")
        try {
            const payload = typeof credentialOrUserInfo === "string" 
                ? { credential: credentialOrUserInfo } 
                : { userInfo: credentialOrUserInfo }

            const res = await axios.post(`${API_BASE_URL}/google`, payload)
            if (res.data.success) {
                setToken(res.data.token)
                setUser(res.data.user)
                return { success: true }
            }
        } catch (err) {
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
