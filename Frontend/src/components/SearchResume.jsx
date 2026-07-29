import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../context/AuthContext"
import FolderManager from "./FolderManager"
import {
  UnderlineDraw,
  DoodleCrane,
  DoodleBooks,
} from "./Handwriting"
import {
  Upload,
  Search,
  FileText,
  Sparkles,
  X,
  Loader2,
  GraduationCap,
  ArrowRight,
  Trash2,
  LogIn
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

const SearchResume = () => {
  const { token, user } = useAuth()
  const isAuthenticated = Boolean(token && user)
  const [activeFolder, setActiveFolder] = useState("all")
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [query, setQuery] = useState("")
  const [resumes, setResumes] = useState([])
  const [totalUserResumes, setTotalUserResumes] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [refreshFolderKey, setRefreshFolderKey] = useState(0)

  // Interactive Hero Tab state
  const [heroTab, setHeroTab] = useState("search")

  const navigate = useNavigate()

  const getApiUrl = (endpoint) => {
    return `${getBackendUrl()}${endpoint}`
  }

  const PRESET_QUERIES = [
    "Python ML Developer with FastAPI",
    "Full Stack Node & React Specialist",
    "Frontend Lead with Vite & Tailwind",
    "DevOps & Cloud Systems Architect",
    "Cybersecurity & Penetration Tester"
  ]

  // =====================
  // CANDIDATE FETCH
  // =====================
  const fetchCandidates = async (searchQuery = query, overrideFolderId = activeFolder) => {
    if (!isAuthenticated) {
      return
    }
    const activeQuery = (typeof searchQuery === "string" ? searchQuery : query).trim()
    const targetFolder = (typeof overrideFolderId === "string") ? overrideFolderId : activeFolder

    if (!activeQuery && targetFolder === "all") {
      setResumes([])
      setSearchAttempted(false)
      return
    }

    try {
      setSearchLoading(true)
      setSearchAttempted(true)

      const headers = { Authorization: `Bearer ${token}` }
      let response

      if (activeQuery) {
        const url = getApiUrl("/ai-search")
        response = await axios.get(url, {
          params: { query: activeQuery, folderId: targetFolder },
          headers
        })
      } else {
        const url = getApiUrl("/search")
        response = await axios.get(url, {
          params: { query: "", folderId: targetFolder },
          headers
        })
      }

      setResumes(response.data.resumes || [])
      setTotalUserResumes(response.data.totalUserResumes ?? response.data.resumes?.length ?? 0)
    } catch (error) {
      console.error("Fetch candidates error:", error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleDeleteResume = async (e, resumeId) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    if (!confirm("Are you sure you want to delete this candidate CV? It will be removed from your search results.")) {
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.delete(getApiUrl(`/resumes/${resumeId}`), { headers })
      setResumes((prev) => prev.filter((r) => r._id !== resumeId))
      setRefreshFolderKey((k) => k + 1)
    } catch (err) {
      alert("Error deleting resume: " + (err.response?.data?.message || err.message))
    }
  }

  useEffect(() => {
    if (isAuthenticated && activeFolder !== "all") {
      fetchCandidates(query, activeFolder)
    } else if (isAuthenticated && activeFolder === "all" && query.trim()) {
      fetchCandidates(query, activeFolder)
    }
  }, [isAuthenticated, activeFolder])

  // =====================
  // FILE FILTER (PDF & DOCX)
  // =====================
  const filterValidFiles = (incomingFiles) => {
    const validList = []
    const rejectedNames = []

    Array.from(incomingFiles).forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase()
      if (ext === "pdf" || ext === "docx") {
        validList.push(file)
      } else {
        rejectedNames.push(file.name)
      }
    })

    if (rejectedNames.length > 0) {
      setUploadStatus({
        type: "warning",
        message: `Skipped ${rejectedNames.length} invalid file(s) (${rejectedNames.join(", ")}). Only PDF and DOCX documents are supported.`
      })
    }

    return validList
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = filterValidFiles(e.target.files)
      setFiles((prev) => [...prev, ...valid])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const valid = filterValidFiles(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...valid])
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    setFiles([])
    setUploadStatus(null)
  }

  // =====================
  // UPLOAD RESUMES
  // =====================
  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Please select or drop valid PDF/DOCX resumes first.")
      return
    }

    try {
      setUploadLoading(true)
      setUploadStatus(null)

      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append("resumes", files[i])
      }
      if (activeFolder && activeFolder !== "all") {
        formData.append("folderId", activeFolder)
      }

      const url = getApiUrl("/upload")
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.post(url, formData, { headers })
      const { count, duplicatesSkipped, message } = response.data

      let statusMsg = message || `Successfully indexed ${count} candidate resume(s)!`
      if (duplicatesSkipped > 0) {
        statusMsg += ` (${duplicatesSkipped} duplicate resume(s) skipped)`
      }

      setUploadStatus({
        type: count > 0 ? "success" : "warning",
        message: statusMsg
      })
      setFiles([])

      await fetchCandidates(query, activeFolder)
      setRefreshFolderKey((prev) => prev + 1)
    } catch (error) {
      console.error("Upload error:", error)
      const errMsg = error.response?.data?.message || "Failed to upload resumes. Only PDF and DOCX documents are accepted."
      setUploadStatus({
        type: "error",
        message: errMsg
      })
    } finally {
      setUploadLoading(false)
    }
  }

  const handleSearch = async (searchQuery, overrideFolderId) => {
    fetchCandidates(searchQuery, overrideFolderId)
  }

  return (
    <div className="min-h-screen bg-[#0F1012] text-[#F9F8F6] font-sans selection:bg-violet-600 selection:text-white overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 1. DARK MODE HERO SECTION (Split-Entry Headline: Left & Right) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-16 pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#23252E]">
        
        {/* Ambient Glow & Doodles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-tr from-violet-600/15 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
        
        <DoodleCrane className="absolute top-12 left-8 md:left-24 opacity-40 pointer-events-none hidden sm:block" />
        <DoodleBooks className="absolute top-28 right-8 md:right-24 opacity-30 pointer-events-none hidden sm:block" />
        
        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
          
          {/* Editorial Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#16171B] border border-[#272930] text-xs font-mono tracking-wider text-violet-300 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>EDITORIAL TALENT INTELLIGENCE ENGINE</span>
          </motion.div>

          {/* HEADLINE: Split Animation - Line 1 comes from LEFT, Line 2 comes from RIGHT */}
          <div className="space-y-2 overflow-hidden py-2">
            <motion.div
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#F9F8F6] tracking-tight leading-none"
            >
              Recruit like a human.
            </motion.div>

            <motion.div
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#F9F8F6] tracking-tight leading-none"
            >
              <span className="italic font-light text-zinc-300">Powered by </span>
              <span className="relative inline-block highlight-marker highlight-purple font-medium text-white">
                intelligence.
              </span>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans"
          >
            Precision-grade resume screening, semantic vector matching, and automated candidate evaluations crafted for thoughtful talent acquisition.
          </motion.p>

          {/* Quick CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              href="#search-workspace"
              className="px-7 py-3.5 rounded-full bg-[#FAF8F5] !text-[#0F1012] text-xs font-bold shadow-xl flex items-center gap-2"
            >
              <span>Explore Candidate Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </motion.a>
            
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/dashboard")}
              className="px-7 py-3.5 rounded-full bg-[#16171B] text-zinc-200 border border-[#272930] text-xs font-semibold hover:border-zinc-500 hover:text-white transition"
            >
              View Analytics Dashboard
            </motion.button>
          </motion.div>

          {/* HERO APP PREVIEW MOCKUP */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-8 max-w-5xl mx-auto"
          >
            <div className="relative rounded-3xl bg-[#16171B]/95 border border-[#2B2D38] shadow-2xl p-4 sm:p-6 text-left overflow-hidden">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-[#272930] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-zinc-400 ml-2 hidden sm:inline">talent_ai_workspace</span>
                </div>
                
                {/* Switcher Tabs */}
                <div className="flex items-center gap-1 bg-[#0F1012] p-1 rounded-full border border-[#272930]">
                  <button
                    onClick={() => setHeroTab("search")}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                      heroTab === "search" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Semantic Matcher
                  </button>
                  <button
                    onClick={() => setHeroTab("folders")}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                      heroTab === "folders" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Role Pools
                  </button>
                  <button
                    onClick={() => setHeroTab("ai")}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                      heroTab === "ai" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    AI Dossier Insight
                  </button>
                </div>
              </div>

              {/* Tab Content Display */}
              <AnimatePresence mode="wait">
                {heroTab === "search" && (
                  <motion.div
                    key="tab-search"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="p-4 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-serif italic text-zinc-300 font-bold">Alex Morgan</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">98% Match</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        Ex-Stripe Senior React engineer with expertise in micro-frontends and state machines.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">React</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">TypeScript</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">Node</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-serif italic text-zinc-300 font-bold">Dr. Priya Sharma</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">94% Match</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        FastAPI & PyTorch ML Researcher specializing in LLM quantization and RAG pipelines.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">PyTorch</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">FastAPI</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">VectorDB</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-serif italic text-zinc-300 font-bold">Marcus Vance</span>
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-mono">89% Match</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        DevOps Architect experienced with Kubernetes, Terraform, and high-availability CI/CD.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">AWS</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">Kubernetes</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">Docker</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {heroTab === "folders" && (
                  <motion.div
                    key="tab-folders"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-4"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-[#272930] pb-3">
                      <span className="font-serif italic text-lg text-white">Active Job Role Folders</span>
                      <span className="text-violet-400 font-mono text-[11px]">+ Create Role Pool</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-[#16171B] border border-[#272930] text-xs space-y-1">
                        <div className="text-zinc-200 font-semibold">Senior ML Engineers</div>
                        <div className="text-[10px] text-zinc-400">14 Indexed Dossiers</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#16171B] border border-[#272930] text-xs space-y-1">
                        <div className="text-zinc-200 font-semibold">Fullstack React/Node</div>
                        <div className="text-[10px] text-zinc-400">28 Indexed Dossiers</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#16171B] border border-[#272930] text-xs space-y-1">
                        <div className="text-zinc-200 font-semibold">Product Designers</div>
                        <div className="text-[10px] text-zinc-400">9 Indexed Dossiers</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#16171B] border border-[#272930] text-xs space-y-1">
                        <div className="text-zinc-200 font-semibold">Cloud Infrastructure</div>
                        <div className="text-[10px] text-zinc-400">19 Indexed Dossiers</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {heroTab === "ai" && (
                  <motion.div
                    key="tab-ai"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-violet-400 font-mono">
                      <Sparkles className="w-4 h-4" />
                      <span>GEMINI AI CANDIDATE SYNOPSIS</span>
                    </div>
                    <p className="font-serif italic text-lg text-[#F9F8F6] leading-relaxed">
                      "Candidate demonstrates rare mastery of distributed systems and zero-downtime database migrations, backed by 4 verified open-source contributions."
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. WARM CREAM SECTION (Scroll-Triggered Animated Entrance) */}
      {/* ========================================================================= */}
      <section className="bg-cream-paper py-20 px-4 sm:px-6 lg:px-8 border-b border-[#E6E0D6] relative overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-4 max-w-3xl mx-auto"
          >
            <span className="text-xs font-mono uppercase tracking-widest text-[#E06D53] font-semibold">
              Made for passionate recruiters
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#18181B] font-normal leading-tight">
              Plenty of tools search keywords. <br />
              <span className="relative inline-block italic font-light text-[#E06D53]">
                That's not us.
                <UnderlineDraw color="#E06D53" />
              </span>
            </h2>
            <p className="text-zinc-600 text-sm sm:text-base leading-relaxed font-sans pt-2">
              TalentAI is here to help you evaluate real candidate potential, extract authentic technical depth, and celebrate talent in all its forms.
            </p>
          </motion.div>

          {/* 3-Card Editorial Features (Staggered Scroll Entrance) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            
            {[
              {
                num: "01",
                title: "Semantic Vector Intelligence",
                desc: "Rather than relying on mechanical keyword matching, our Gemini AI vector engine evaluates deep conceptual relevance across experience and domain contexts."
              },
              {
                num: "02",
                title: "Role Folder Workspaces",
                desc: "Organize candidate pools into dedicated role folders. Easily isolate candidates per requisition without cluttering your global database."
              },
              {
                num: "03",
                title: "Live Video & Exam Verification",
                desc: "Generate instant online coding assessments or live AI video interviews with secure token links directly from the candidate dossier."
              }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="p-8 rounded-3xl bg-cream-card border border-[#E6E0D6] space-y-4 relative group shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-white flex items-center justify-center text-lg font-serif">
                  {card.num}
                </div>
                <h3 className="font-serif text-2xl text-[#18181B] font-semibold">
                  {card.title}
                </h3>
                <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed">
                  {card.desc}
                </p>
              </motion.div>
            ))}

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN SEARCH WORKSPACE (Visible only when logged in) */}
      {/* ========================================================================= */}
      {isAuthenticated ? (
        <section id="search-workspace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#23252E] pb-6"
        >
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
              // Candidate Search & Indexing Workspace
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#F9F8F6] font-normal">
              Candidate Pool & Search Engine
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-4 py-2 rounded-full bg-[#16171B] border border-[#272930] text-zinc-300">
              Total Pool: <strong className="text-white">{totalUserResumes !== null ? totalUserResumes : "Private"}</strong> Resumes
            </div>
          </div>
        </motion.div>

        {/* JOB ROLE FOLDERS */}
        <FolderManager
          activeFolder={activeFolder}
          setActiveFolder={setActiveFolder}
          refreshKey={refreshFolderKey}
          onFolderChange={(folderId) => {
            fetchCandidates(query, folderId)
          }}
        />

        {/* 2-COLUMN WORKSPACE GRID (UPLOAD + SEARCH) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: RESUME INDEXING DROPZONE */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 bg-[#16171B] border border-[#272930] rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6"
          >
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[#272930] pb-3">
                <h3 className="font-serif text-lg text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-violet-400" />
                  <span>Resume Indexer</span>
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">PDF & DOCX</span>
              </div>

              {/* Dropzone Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-7 text-center transition-all ${
                  isDragging
                    ? "border-violet-500 bg-violet-600/10"
                    : "border-[#2E3038] bg-[#0F1012] hover:border-zinc-500"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white font-sans">Drag & Drop candidate resumes here</p>
                    <p className="text-[11px] text-zinc-400 mt-1">or <span className="text-violet-400 underline">select files from computer</span></p>
                  </div>
                </div>
              </div>

              {/* Selected Files List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2 max-h-36 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Selected Files ({files.length}):</span>
                    <button onClick={clearAllFiles} className="text-rose-400 hover:underline">Clear</button>
                  </div>
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0F1012] border border-[#272930] text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="truncate text-zinc-200">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(idx)} className="text-zinc-500 hover:text-rose-400 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Status Banners */}
              {uploadStatus && (
                <div className={`mt-4 p-3 rounded-xl text-xs border ${
                  uploadStatus.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                }`}>
                  {uploadStatus.message}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleUpload}
              disabled={uploadLoading || files.length === 0}
              className="w-full py-3.5 rounded-full bg-[#FAF8F5] !text-[#0F1012] text-xs font-bold shadow-xl transition disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Indexing Candidates...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Index {files.length > 0 ? `${files.length} File(s)` : "Resumes"}</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* RIGHT COLUMN: AI SEARCH BAR & PRESETS */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-[#16171B] border border-[#272930] rounded-3xl p-6 shadow-xl space-y-6 flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#272930] pb-3">
                <h3 className="font-serif text-lg text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-violet-400" />
                  <span>AI Semantic Candidate Search</span>
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">Natural Language Prompt</span>
              </div>

              {/* Search Box Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="e.g. Python ML Developer with FastAPI, PyTorch & 8+ CGPA"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch()
                  }}
                  className="w-full bg-[#0F1012] border border-[#272930] rounded-full pl-12 pr-28 py-4 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-28 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs px-2 py-1"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => handleSearch()}
                  disabled={searchLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </div>

              {/* Preset Query Pills */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Suggested Editorial Queries:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_QUERIES.map((preset, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setQuery(preset)
                        handleSearch(preset)
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#0F1012] border border-[#272930] hover:border-violet-500/50 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
                    >
                      {preset}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Analytics Link */}
            <div className="pt-4 border-t border-[#272930] flex items-center justify-between text-xs">
              <span className="text-zinc-400">Desire deep skill breakdown & metrics?</span>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
              >
                Open Analytics <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* CANDIDATE RANKINGS SECTION */}
        <div className="space-y-8 pt-6">
          <div className="flex items-center justify-between border-b border-[#23252E] pb-4">
            <h3 className="font-serif text-2xl text-white flex items-center gap-3">
              <span>Candidate Rankings Dossier</span>
              {resumes.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono">
                  {resumes.length} Candidate(s) Matched
                </span>
              )}
            </h3>
          </div>

          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 space-y-4 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="w-32 h-6 bg-zinc-800 rounded" />
                    <div className="w-12 h-6 bg-zinc-800 rounded-full" />
                  </div>
                  <div className="w-24 h-4 bg-zinc-800/60 rounded" />
                  <div className="w-full h-16 bg-zinc-800/40 rounded-xl" />
                </div>
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-xl text-white">
                {searchAttempted ? "No Matching Candidate Dossiers Found" : "Search Candidate Intelligence Pool"}
              </h4>
              <p className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed font-sans">
                {searchAttempted
                  ? `No candidates matched "${query}". Try searching for specific technical skills like Python, React, Java, or DevOps.`
                  : "Enter a job requirement prompt above or choose a suggested query to view ranked candidate dossiers."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumes.map((resume, idx) => (
                <motion.div
                  key={resume._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => navigate("/candidate", { state: resume })}
                  className="group bg-[#16171B] hover:bg-[#1A1C22] border border-[#272930] hover:border-violet-500/40 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-serif font-bold text-base flex items-center justify-center shadow-md shrink-0">
                          {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className="truncate">
                          <h4 className="font-serif text-lg font-normal text-[#F9F8F6] group-hover:text-violet-300 transition-colors truncate">
                            {resume.name || "Candidate Dossier"}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                            <GraduationCap className="w-3 h-3 text-violet-400 shrink-0" />
                            <span className="truncate">{resume.college || "Graduate"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Pill & Delete Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                          {resume.score ? `${resume.score}` : "N/A"}
                        </div>
                        <button
                          onClick={(e) => handleDeleteResume(e, resume._id)}
                          title="Delete candidate CV"
                          className="p-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Role & Folder Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {resume.folder?.name && (
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-mono">
                          📁 {resume.folder.name}
                        </span>
                      )}
                      {resume.roleCategory && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                          🏷️ {resume.roleCategory}
                        </span>
                      )}
                    </div>

                    {/* AI Insight Box */}
                    <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-3.5 mb-4 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-violet-400 font-mono text-[10px] uppercase">
                        <Sparkles className="w-3 h-3" />
                        <span>Editorial AI Evaluation</span>
                      </div>
                      <p className="text-zinc-300 text-[11px] font-sans leading-relaxed line-clamp-2">
                        {resume.reason || "Matched based on technical capability, domain experience, and overall fit."}
                      </p>
                    </div>

                    {/* Skill Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {resume.skills?.slice(0, 5).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 rounded-full bg-[#0F1012] border border-[#272930] text-zinc-300 text-[10px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="pt-3 border-t border-[#272930] flex items-center justify-between text-xs text-zinc-400 group-hover:text-violet-300 transition">
                    <span>View Candidate Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-[#16171B] border border-[#272930] rounded-3xl p-10 sm:p-16 space-y-6 max-w-3xl mx-auto shadow-2xl relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-3xl sm:text-4xl text-white font-normal">
                Ready to experience thoughtful hiring?
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto font-sans leading-relaxed">
                Sign in or create a free account to upload candidate CVs, structure job role pools, run vector semantic searches, and conduct live video interviews.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-3.5 rounded-full bg-[#FAF8F5] !text-[#0F1012] font-bold text-xs shadow-xl hover:bg-white transition-all cursor-pointer"
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3.5 rounded-full bg-[#0F1012] text-white border border-[#272930] hover:border-zinc-500 font-semibold text-xs transition-all cursor-pointer"
              >
                Sign In to Workspace
              </button>
            </div>
          </motion.div>
        </section>
      )}
    </div>
  )
}

export default SearchResume
