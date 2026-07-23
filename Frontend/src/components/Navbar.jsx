import { Link, useLocation } from "react-router-dom"
import { Sparkles, Search, BarChart3, LogIn, UserPlus, LogOut, User as UserIcon } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const Navbar = () => {
    const location = useLocation()
    const { user, logout } = useAuth()

    const isActive = (path) => location.pathname === path

    const getInitials = (name) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* LOGO */}
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-200">
                            <Sparkles className="w-5 h-5 text-indigo-100" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                                    Talent<span className="text-indigo-400">AI</span>
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                                    ATS Enterprise
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 hidden sm:block">
                                Intelligent Resume Screening & Vector Matching
                            </p>
                        </div>
                    </Link>

                    {/* DESKTOP NAV LINKS */}
                    <nav className="flex items-center gap-1 sm:gap-2">
                        <Link
                            to="/"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive("/")
                                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-inner"
                                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                            }`}
                        >
                            <Search className="w-4 h-4" />
                            <span>Resume Matcher</span>
                        </Link>

                        <Link
                            to="/dashboard"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive("/dashboard")
                                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-inner"
                                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>Analytics</span>
                        </Link>
                    </nav>

                    {/* AUTH USER BADGE / BUTTONS */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-full pl-2 pr-3 py-1">
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-7 h-7 rounded-full object-cover border border-indigo-500/50"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                        {getInitials(user.name)}
                                    </div>
                                )}

                                <div className="hidden md:flex flex-col text-left">
                                    <span className="text-xs font-semibold text-white leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 leading-tight">
                                        {user.authProvider === "google" ? "Google Auth" : user.email}
                                    </span>
                                </div>

                                <button
                                    onClick={logout}
                                    title="Logout"
                                    className="ml-1 p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login"
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-800 transition-all"
                                >
                                    <LogIn className="w-3.5 h-3.5" />
                                    <span>Sign In</span>
                                </Link>

                                <Link
                                    to="/signup"
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Sign Up</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Navbar
