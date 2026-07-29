import { Link } from "react-router-dom"
import { Globe, Code2, Share2, Cpu, ShieldCheck } from "lucide-react"
import { DoodleCrane } from "./Handwriting"
import logoImg from "../assets/logo.png"

const Footer = () => {
  return (
    <footer role="contentinfo" className="bg-[#0F1012] border-t border-[#23252E] pt-16 pb-12 text-zinc-400 text-sm mt-auto relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#23252E]">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3 group inline-block">
              <div className="w-9 h-9 rounded-full bg-[#16171B] flex items-center justify-center shadow-md border border-violet-500/30 overflow-hidden p-1">
                <img src={logoImg} alt="TalentAI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-serif italic font-normal text-2xl tracking-tight text-[#F9F8F6]">
                  Talent<span className="font-sans non-italic font-bold text-violet-400">AI</span>
                </span>
              </div>
            </Link>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-sm font-sans">
              An editorial AI resume matching platform built with Gemini neural embeddings, custom vector search, and hand-annotated candidate evaluation scoring.
            </p>
            <div className="flex items-center gap-3 text-zinc-400 pt-2">
              <a href="#" aria-label="Website" className="w-9 h-9 rounded-full bg-[#16171B] border border-[#272930] flex items-center justify-center hover:text-white hover:border-violet-500/50 transition-all">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Developer Resources" className="w-9 h-9 rounded-full bg-[#16171B] border border-[#272930] flex items-center justify-center hover:text-white hover:border-violet-500/50 transition-all">
                <Code2 className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Share Platform" className="w-9 h-9 rounded-full bg-[#16171B] border border-[#272930] flex items-center justify-center hover:text-white hover:border-violet-500/50 transition-all">
                <Share2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Platform
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-violet-300 transition-colors">
                  Resume Matcher
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-violet-300 transition-colors">
                  Analytics Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-violet-300 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-violet-300 transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Capabilities
            </h3>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li className="hover:text-zinc-200 transition-colors cursor-default">
                Semantic Vector Search
              </li>
              <li className="hover:text-zinc-200 transition-colors cursor-default">
                Gemini AI Dossier Analysis
              </li>
              <li className="hover:text-zinc-200 transition-colors cursor-default">
                Automatic Skill Extraction
              </li>
              <li className="hover:text-zinc-200 transition-colors cursor-default">
                Live Video Assessment
              </li>
            </ul>
          </div>

          {/* System Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Engine Health
            </h3>
            <div className="p-4 rounded-2xl bg-[#16171B] border border-[#272930] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <Cpu className="w-4 h-4 text-violet-400" />
                <span>Gemini Pro v1.5 API</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>JWT Encryption</span>
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Vector Engine Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-sans">
          <p>© {new Date().getFullYear()} TalentAI Enterprise. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Editorial Standard</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
