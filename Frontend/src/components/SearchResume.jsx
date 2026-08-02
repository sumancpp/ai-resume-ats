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
  Trash2
} from "lucide-react"

import { getBackendUrl } from "../utils/api"
import { toast } from "react-hot-toast"
import ConfirmModal from "./ConfirmModal"

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
    if (!isAuthenticated) return

    const activeQuery = (typeof searchQuery === "string" ? searchQuery : query).trim()
    const targetFolder = (typeof overrideFolderId === "string") ? overrideFolderId : activeFolder

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

  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteResume = (e, resumeId) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    setDeleteTargetId(resumeId)
  }

  const executeDeleteResume = async () => {
    if (!deleteTargetId) return
    try {
      setDeleteLoading(true)
      const headers = { Authorization: `Bearer ${token}` }
      await axios.delete(getApiUrl(`/resumes/${deleteTargetId}`), { headers })
      setResumes((prev) => prev.filter((r) => r._id !== deleteTargetId))
      setRefreshFolderKey((k) => k + 1)
      toast.success("Resume deleted permanently.")
      setDeleteTargetId(null)
    } catch (err) {
      toast.error("Error deleting resume: " + (err.response?.data?.message || err.message))
    } finally {
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
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
    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    if (files.length === 0) {
      toast.error("Please select or drop valid PDF/DOCX resumes first.")
      return
    }

    try {
      setUploadLoading(true)
      setUploadStatus(null)

      const formData = new FormData()
      files.forEach((file) => {
        formData.append("resumes", file)
      })

      if (activeFolder && activeFolder !== "all") {
        formData.append("folderId", activeFolder)
      }

      const headers = {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`
      }

      const url = getApiUrl("/upload")
      const response = await axios.post(url, formData, { headers })

      if (response.data.success) {
        const uploadedCount = response.data.uploadedResumes?.length || 0
        const skippedCount = response.data.duplicatesSkipped || 0

        let message = ""
        if (uploadedCount > 0 && skippedCount > 0) {
          message = `Successfully indexed ${uploadedCount} new resume(s). ${skippedCount} duplicate file(s) skipped.`
        } else if (uploadedCount > 0) {
          message = `Successfully indexed ${uploadedCount} candidate resume(s)!`
        } else if (skippedCount > 0) {
          message = `Skipped ${skippedCount} file(s) because they were already uploaded previously.`
        } else {
          message = response.data.message || "Resume indexing complete."
        }

        setUploadStatus({
          type: uploadedCount > 0 ? "success" : "warning",
          message
        })
        setFiles([])
        setRefreshFolderKey((prev) => prev + 1)
        fetchCandidates(query, activeFolder)
      }
    } catch (error) {
      console.error("Upload error:", error)
      const errorMsg = error.response?.data?.message || "Failed to upload and index resumes."
      setUploadStatus({ type: "error", message: errorMsg })
    } finally {
      setUploadLoading(false)
    }
  }

  // =====================
  // SEARCH HANDLER
  // =====================
  const handleSearch = async (customQuery = null) => {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    const searchQuery = customQuery !== null ? customQuery : query
    fetchCandidates(searchQuery, activeFolder)
  }

  return (
    <div className="min-h-screen bg-[#0F1012] text-[#F9F8F6] font-sans overflow-x-hidden">

      {/* ========================================================================= */}
      {/* 1. PUBLIC HERO SECTION (High-Contrast Editorial Obsidian Mode) */}
      {/* ========================================================================= */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[#23252E]">
        
        {/* Decorative Sketched Doodles */}
        <DoodleCrane className="absolute top-12 left-8 md:left-24 opacity-25 pointer-events-none" />
        <DoodleBooks className="absolute bottom-12 right-8 md:right-24 opacity-25 pointer-events-none" />

        {/* Ambient Subtle Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">

          {/* Editorial Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#16171B] border border-[#272930] text-xs font-mono tracking-wider uppercase text-violet-300 shadow-xl"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>EDITORIAL TALENT INTELLIGENCE ENGINE</span>
          </motion.div>

          {/* SPLIT-HEADLINE ENTRANCE ANIMATION (Line 1 from left, Line 2 from right) */}
          <div className="space-y-3 max-w-4xl mx-auto">
            <motion.h1
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#F9F8F6] leading-[1.1]"
            >
              Recruit like a human.
            </motion.h1>

            <motion.h1
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl sm:text-6xl md:text-7xl font-light italic tracking-tight text-violet-300 leading-[1.1] relative inline-block"
            >
              Powered by intelligence.
              <UnderlineDraw color="#8B5CF6" />
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-zinc-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-sans font-normal"
          >
            A high-craft resume screening workspace combining Gemini neural vector search, 
            instant coding assessment tokens, and live video evaluations.
          </motion.p>

          {/* Quick CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (isAuthenticated) {
                  document.getElementById("search-workspace")?.scrollIntoView({ behavior: "smooth" })
                } else {
                  navigate("/signup")
                }
              }}
              className="px-7 py-3.5 rounded-full bg-[#FAF8F5] !text-[#0F1012] text-xs font-bold shadow-xl flex items-center gap-2 cursor-pointer transition"
            >
              <span>{isAuthenticated ? "Explore Candidate Workspace" : "Get Started — Free"}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
              className="px-7 py-3.5 rounded-full bg-[#16171B] text-zinc-200 border border-[#272930] text-xs font-semibold hover:border-zinc-500 hover:text-white transition"
            >
              {isAuthenticated ? "View Analytics Dashboard" : "Sign In to Workspace"}
            </motion.button>
          </motion.div>

          {/* HERO APP PREVIEW MOCKUP */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-8 max-w-4xl mx-auto"
          >
            <div className="rounded-3xl bg-[#16171B] border border-[#272930] p-4 sm:p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-[#272930] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-zinc-500 pl-2">TalentAI Candidate Matcher</span>
                </div>

                <div className="flex items-center space-x-1 bg-[#0F1012] p-1 rounded-full border border-[#272930] text-[11px] font-sans">
                  <button
                    onClick={() => setHeroTab("search")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${heroTab === "search" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
                  >
                    AI Search Demo
                  </button>
                  <button
                    onClick={() => setHeroTab("synopsis")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${heroTab === "synopsis" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
                  >
                    Dossier Preview
                  </button>
                </div>
              </div>

              {/* Tab Content Mockup */}
              <AnimatePresence mode="wait">
                {heroTab === "search" ? (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="p-3.5 rounded-2xl bg-[#0F1012] border border-[#272930] flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>Query: "Full-Stack Engineer with React & Node.js"</span>
                      <span className="text-violet-400 font-semibold">Match Score: 96%</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-normal text-white text-base">Alex Morgan</h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">96% Fit</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-sans">Stanford University • 8.9 CGPA</p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {["React", "Node.js", "TypeScript", "PostgreSQL"].map((sk, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#16171B] text-[10px] text-zinc-300 border border-[#272930]">{sk}</span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#0F1012] border border-[#272930] space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-normal text-white text-base">Sophia Chen</h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">92% Fit</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-sans font-normal">MIT • 9.2 CGPA</p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {["Python", "FastAPI", "Docker", "PyTorch"].map((sk, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#16171B] text-[10px] text-zinc-300 border border-[#272930]">{sk}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="synopsis"
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
      {/* 3. RECRUITER SEARCH WORKSPACE (UNLOCKED ONLY AFTER LOG IN / SIGN UP) */}
      {/* ========================================================================= */}
      {isAuthenticated && (
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
                Total Pool: <strong className="text-white">{totalUserResumes !== null ? totalUserResumes : "0"}</strong> Resumes
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
                  {searchAttempted && query.trim() ? "No Matching Candidate Dossiers Found" : "No Candidate Resumes in Pool"}
                </h4>
                <p className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed font-sans">
                  {query.trim()
                    ? `No candidates matched "${query}". Try searching for specific technical skills like Python, React, Java, or DevOps.`
                    : "No candidate resumes found in your workspace. Use the Resume Indexer on the left to upload PDF/DOCX resumes!"}
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
                          <div className={`px-3 py-1 rounded-full font-mono text-xs font-bold ${resume.score ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-violet-500/10 border border-violet-500/20 text-violet-300"}`}>
                            {resume.score ? `${resume.score} Match` : "Verified"}
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

          {/* EDITORIAL PHILOSOPHY QUOTE CARD (RIGHT BEFORE FOOTER) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative p-8 sm:p-12 rounded-3xl bg-[#16171B] border border-[#272930] overflow-hidden shadow-xl mt-12"
          >
            <DoodleCrane className="absolute top-4 right-6 opacity-30 pointer-events-none" />
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-mono tracking-widest text-violet-400 uppercase">
                // Editorial Philosophy
              </p>
              <h2 className="font-serif italic text-2xl sm:text-4xl text-[#F9F8F6] leading-tight">
                “More than any other single invention, thoughtful hiring transforms human endeavor.”
              </h2>
              <p className="text-xs text-zinc-400 font-sans pt-2">
                — Designed with passion for talent acquisition teams and candidates alike.
              </p>
            </div>
          </motion.div>

        </section>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={executeDeleteResume}
        title="Delete Candidate Resume?"
        description="Are you sure you want to permanently delete this candidate resume? It will be removed from your database and search results."
        confirmText="Delete Permanently"
        loading={deleteLoading}
        variant="danger"
      />
    </div>
  )
}

export default SearchResume
