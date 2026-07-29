import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Sparkles, Search, BarChart3, LogIn, UserPlus, LogOut, Menu, X } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { motion } from "framer-motion"

const Navbar = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <header className="sticky top-0 z-50 bg-[#0F1012]/90 backdrop-blur-md border-b border-[#23252E] shadow-2xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO - Ellipsus Editorial Style */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-950/40 group-hover:scale-105 transition-all duration-300 border border-violet-400/30">
              <Sparkles className="w-5 h-5 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif italic font-normal text-2xl tracking-tight text-[#F9F8F6] group-hover:text-violet-300 transition-colors">
                  Ai_Resume<span className="font-sans non-italic font-bold text-violet-400">.Ellipsus</span>
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-violet-500/10 text-violet-300 border border-violet-500/30 rounded-full">
                  Editorial ATS
                </span>
              </div>
              <p className="text-[11px] font-handwriting text-zinc-400 -mt-1 hidden sm:block">
                crafted for thoughtful talent match
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-1 bg-[#16171B] p-1.5 rounded-full border border-[#272930] shadow-inner">
            <Link
              to="/"
              className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive("/")
                  ? "text-[#F9F8F6] bg-[#23252E] shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${isActive("/") ? "text-violet-400" : "text-zinc-400"}`} />
              <span>Resume Search</span>
              {isActive("/") && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-1 left-4 right-4 h-[2px] bg-violet-500 rounded-full"
                />
              )}
            </Link>

            <Link
              to="/dashboard"
              className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive("/dashboard")
                  ? "text-[#F9F8F6] bg-[#23252E] shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${isActive("/dashboard") ? "text-violet-400" : "text-zinc-400"}`} />
              <span>Analytics</span>
              {isActive("/dashboard") && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-1 left-4 right-4 h-[2px] bg-violet-500 rounded-full"
                />
              )}
            </Link>
          </nav>

          {/* DESKTOP AUTH USER BADGE / BUTTONS */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-[#16171B] border border-[#2B2D38] rounded-full pl-2.5 pr-4 py-1.5 shadow-sm">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-violet-400/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                    {getInitials(user.name)}
                  </div>
                )}

                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#F9F8F6] leading-tight font-sans">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight">
                    {user.email}
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Logout"
                  className="ml-1 p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 border border-zinc-800 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log in</span>
                </Link>

                <Link
                  to="/signup"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold text-white bg-[#FAF8F5] !text-[#0F1012] hover:bg-white shadow-md hover:scale-105 transition-all duration-200"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign up free</span>
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE HAMBURGER BUTTON */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#272930] bg-[#0F1012]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium ${
              isActive("/") ? "bg-violet-600 text-white font-semibold" : "text-zinc-300 bg-[#16171B] border border-[#272930]"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Resume Search</span>
          </Link>

          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium ${
              isActive("/dashboard") ? "bg-violet-600 text-white font-semibold" : "text-zinc-300 bg-[#16171B] border border-[#272930]"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics Dashboard</span>
          </Link>

          {user ? (
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white">
                  {getInitials(user.name)}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-zinc-400">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  logout()
                  setMobileMenuOpen(false)
                }}
                className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center rounded-2xl text-xs font-semibold text-zinc-300 bg-[#16171B] border border-zinc-800"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center rounded-2xl text-xs font-semibold text-zinc-900 bg-[#FAF8F5]"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
