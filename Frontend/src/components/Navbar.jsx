import { Link, useLocation } from "react-router-dom"
import { Sparkles, Search, BarChart3 } from "lucide-react"

const Navbar = () => {
    const location = useLocation()

    const isActive = (path) => location.pathname === path

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

                    {/* STATUS PILL */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-slate-300">Semantic AI v2.4</span>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Navbar
