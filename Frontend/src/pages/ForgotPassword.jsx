import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react"

const ForgotPassword = () => {
    const [step, setStep] = useState(1) // 1: Email Request, 2: Reset Code & New Password
    const [email, setEmail] = useState("")
    const [resetCode, setResetCode] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [successMsg, setSuccessMsg] = useState("")
    const [autoResetCode, setAutoResetCode] = useState("")

    const navigate = useNavigate()

    const getAuthEndpoint = (path) => {
        const base = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost"
            ? "http://localhost:5000/api/auth"
            : "https://ai-resume-atsp-backend.onrender.com/api/auth")
        return `${base}${path}`
    }

    const handleRequestCode = async (e) => {
        e.preventDefault()
        if (!email) {
            setErrorMsg("Please enter your registered email address")
            return
        }

        setErrorMsg("")
        setIsSubmitting(true)
        try {
            const url = getAuthEndpoint("/forgot-password")
            let res
            try {
                res = await axios.post(url, { email })
            } catch (err) {
                if (!err.response) {
                    res = await axios.post("https://ai-resume-atsp-backend.onrender.com/api/auth/forgot-password", { email })
                } else {
                    throw err
                }
            }

            if (res.data.success) {
                setSuccessMsg(res.data.message)
                setStep(2)
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to process request. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        if (!resetCode || !newPassword) {
            setErrorMsg("Please fill in all fields")
            return
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg("Passwords do not match")
            return
        }

        if (newPassword.length < 6) {
            setErrorMsg("Password must be at least 6 characters long")
            return
        }

        setErrorMsg("")
        setIsSubmitting(true)
        try {
            const url = getAuthEndpoint("/reset-password")
            let res
            try {
                res = await axios.post(url, { email, resetCode, newPassword })
            } catch (err) {
                if (!err.response) {
                    res = await axios.post("https://ai-resume-atsp-backend.onrender.com/api/auth/reset-password", { email, resetCode, newPassword })
                } else {
                    throw err
                }
            }

            if (res.data.success) {
                setSuccessMsg("Password reset successfully! Redirecting to login...")
                setTimeout(() => {
                    navigate("/login")
                }, 2000)
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to reset password.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
            {/* Background Lights */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-indigo-950/40">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-lg shadow-amber-500/20 mb-4">
                            <KeyRound className="w-7 h-7 text-amber-100" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">
                            Reset Your Password
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {step === 1
                                ? "Enter your email address to receive a verification reset code"
                                : "Enter the verification code and set your new password"}
                        </p>
                    </div>

                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Success Banner */}
                    {successMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p>{successMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Request Code */}
                    {step === 1 && (
                        <form onSubmit={handleRequestCode} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Registered Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="recruiter@company.com"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span>Send Verification Code</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Reset Password Form */}
                    {step === 2 && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={resetCode}
                                    onChange={(e) => setResetCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 6 characters"
                                        className="w-full pl-11 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter new password"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span>Update Password</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer navigation */}
                    <div className="text-center mt-6 text-sm text-slate-400 flex items-center justify-center">
                        <Link to="/login" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-medium text-xs">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
