import { Link } from "react-router-dom"
import { Sparkles, Cpu, ShieldCheck, Globe, Code2, Share2 } from "lucide-react"

const Footer = () => {
    return (
        <footer role="contentinfo" className="bg-slate-950 border-t border-slate-800/80 pt-12 pb-8 text-slate-400 text-sm mt-auto relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main 4-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-800/60">
                    {/* Brand Column (2 cols wide on desktop) */}
                    <div className="lg:col-span-2 space-y-4">
                        <Link to="/" className="flex items-center space-x-3 group inline-block">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-200">
                                <Sparkles className="w-5 h-5 text-indigo-100" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                                    Talent<span className="text-indigo-400">AI</span>
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                                    ATS Enterprise
                                </span>
                            </div>
                        </Link>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                            Next-generation AI resume screening platform powered by Google Gemini and vector similarity matching. Automated PDF parsing, skill extraction, and candidate ranking.
                        </p>
                        <div className="flex items-center gap-3 text-slate-400 pt-1">
                            <a href="#" aria-label="Website" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:text-indigo-400 hover:border-indigo-500/30 transition-all">
                                <Globe className="w-4 h-4" />
                            </a>
                            <a href="#" aria-label="Developer Resources" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:text-indigo-400 hover:border-indigo-500/30 transition-all">
                                <Code2 className="w-4 h-4" />
                            </a>
                            <a href="#" aria-label="Share Platform" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:text-indigo-400 hover:border-indigo-500/30 transition-all">
                                <Share2 className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Navigation */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Platform Navigation
                        </h3>
                        <ul className="space-y-2 text-xs">
                            <li>
                                <Link to="/" className="hover:text-indigo-400 transition-colors">
                                    Resume Matcher
                                </Link>
                            </li>
                            <li>
                                <Link to="/dashboard" className="hover:text-indigo-400 transition-colors">
                                    Analytics Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:text-indigo-400 transition-colors">
                                    Sign In
                                </Link>
                            </li>
                            <li>
                                <Link to="/signup" className="hover:text-indigo-400 transition-colors">
                                    Create Account
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Features & AI Engine */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            ATS Features
                        </h3>
                        <ul className="space-y-2 text-xs">
                            <li className="hover:text-slate-300 transition-colors cursor-default">
                                Vector Match Engine
                            </li>
                            <li className="hover:text-slate-300 transition-colors cursor-default">
                                Gemini AI Summaries
                            </li>
                            <li className="hover:text-slate-300 transition-colors cursor-default">
                                Automatic Skill Parser
                            </li>
                            <li className="hover:text-slate-300 transition-colors cursor-default">
                                Candidate Ranking Score
                            </li>
                        </ul>
                    </div>

                    {/* System Status */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            System Status
                        </h3>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                <Cpu className="w-4 h-4 text-indigo-400" />
                                <span>Gemini AI v2.4 API</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span>JWT Auth Protected</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-semibold">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>All Systems Operational</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} TalentAI Enterprise. All rights reserved.</p>
                    <div className="flex items-center space-x-6">
                        <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-slate-400 transition-colors">Security</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
