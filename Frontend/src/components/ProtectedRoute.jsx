import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold text-slate-400 tracking-wider">
                        Authenticating TalentAI session...
                    </span>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute
