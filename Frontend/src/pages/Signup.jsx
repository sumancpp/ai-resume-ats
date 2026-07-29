import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { GoogleLogin } from "@react-oauth/google"
import { motion } from "framer-motion"
import { User, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react"
import { DoodleBooks, UnderlineDraw } from "../components/Handwriting"
import logoImg from "../assets/logo.png"

const Signup = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signup, googleLogin, authError, setAuthError } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      setAuthError("Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long")
      return
    }

    setIsSubmitting(true)
    const res = await signup(name, email, password)
    setIsSubmitting(false)

    if (res?.success) {
      navigate("/")
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      setIsSubmitting(true)
      const res = await googleLogin(credentialResponse.credential)
      setIsSubmitting(false)
      if (res?.success) {
        navigate("/")
      }
    }
  }

  const handleGoogleError = () => {
    setAuthError("Google Sign-Up failed or was closed")
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-[#0F1012] font-sans">
      
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center">
        
        {/* LEFT COLUMN: EDITORIAL BANNER (Enters from Left) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 p-8 rounded-3xl bg-[#16171B] border border-[#272930] hidden lg:flex flex-col justify-between min-h-[500px] relative overflow-hidden"
        >
          <DoodleBooks className="absolute top-6 right-6 opacity-30 pointer-events-none" />
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#0F1012] border border-violet-500/30 flex items-center justify-center p-1.5 overflow-hidden">
              <img src={logoImg} alt="TalentAI Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="font-serif text-3xl font-normal text-[#F9F8F6] leading-snug">
              Begin your <br />
              <span className="italic text-violet-300 font-light relative inline-block">
                editorial journey.
                <UnderlineDraw color="#8B5CF6" />
              </span>
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans pt-2">
              Create an account to build candidate dossiers, structure role pools, and automate evaluation workflows.
            </p>
          </div>

          <div className="pt-6 border-t border-[#272930] text-[11px] text-zinc-500 font-mono">
            TalentAI ATS Workspace
          </div>
        </motion.div>

        {/* RIGHT COLUMN: SIGNUP FORM (Enters from Right) */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 bg-[#16171B] border border-[#272930] rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6"
        >
          <div className="text-left space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white">
              Create an account
            </h1>
            <p className="text-xs text-zinc-400 font-sans">
              Get started with intelligent resume screening & talent matching
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 font-sans">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#0F1012] border border-[#272930] rounded-full text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#0F1012] border border-[#272930] rounded-full text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-11 pr-11 py-2.5 bg-[#0F1012] border border-[#272930] rounded-full text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#0F1012] border border-[#272930] rounded-full text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#FAF8F5] !text-[#0F1012] font-bold text-xs rounded-full shadow-xl hover:bg-white flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#272930]"></div>
            </div>
            <span className="relative px-4 bg-[#16171B] text-[10px] font-mono text-zinc-500 uppercase">
              Or register with
            </span>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_dark"
              shape="pill"
              width="320"
              text="signup_with"
            />
          </div>

          <div className="text-center text-xs text-zinc-400 pt-1 font-sans">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 font-semibold hover:text-violet-300 transition">
              Sign in
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

export default Signup
