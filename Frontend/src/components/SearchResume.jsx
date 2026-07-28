import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import FolderManager from "./FolderManager"
import {
    Upload,
    Search,
    FileText,
    Sparkles,
    CheckCircle2,
    X,
    Loader2,
    GraduationCap,
    ArrowRight,
    SlidersHorizontal,
    AlertCircle,
    FileWarning,
    FolderPlus,
    Users,
    Briefcase,
    Zap,
    Filter
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

const SearchResume = () => {
    const { token } = useAuth()
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

    const navigate = useNavigate()

    const getApiUrl = (endpoint) => {
        return `${getBackendUrl()}${endpoint}`
    }

    const PRESET_QUERIES = [
        "Python ML Developer",
        "Full Stack Node & React",
        "React Frontend Specialist",
        "DevOps & Cloud Engineer",
        "Cybersecurity Analyst"
    ]

    // =====================
    // REAL-TIME CANDIDATE FETCH & REFRESH
    // =====================
    const fetchCandidates = async (searchQuery = query, overrideFolderId = activeFolder) => {
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

    // Auto-fetch candidates in real-time whenever active folder or auth token changes
    useEffect(() => {
        let interval = null
        if (token) {
            fetchCandidates(query, activeFolder)
            interval = setInterval(() => {
                fetchCandidates(query, activeFolder)
            }, 6000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [token, activeFolder])

    // =====================
    // STRICT FILE FILTER (PDF & DOCX ONLY)
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
    // UPLOAD RESUMES (REAL-TIME INSTANT UPDATE)
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

            // Real-time update candidate list & folder badges without page refresh!
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

    // =====================
    // SEMANTIC AI SEARCH (USER & FOLDER ISOLATED)
    // =====================
    const handleSearch = async (searchQuery, overrideFolderId) => {
        fetchCandidates(searchQuery, overrideFolderId)
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
            
            {/* HERO BANNER SECTION */}
            <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border-b border-slate-800/80 pt-10 pb-12 px-4 sm:px-6 lg:px-8">
                {/* Background Ambient Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />
                
                <div className="max-w-7xl mx-auto relative z-10 text-center space-y-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                        <span>AI Talent Discovery & Smart ATS</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
                        Find the Perfect Candidate in <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Seconds</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                        Upload candidate resumes, organize candidate pools by target job roles, and search top talent using Gemini AI.
                    </p>

                    {/* Quick Stats Bar */}
                    <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <span>Indexed Candidates: <strong className="text-white">{totalUserResumes !== null ? totalUserResumes : "Private Pool"}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span>Match Engine: <strong className="text-emerald-400">Gemini AI Grounded</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN DASHBOARD CONTENT CONTAINER */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* JOB ROLE POOLS & FOLDERS NAV */}
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
                    
                    {/* LEFT COLUMN: RESUME INDEXING DROPZONE (5 cols) */}
                    <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-indigo-400" />
                                    Resume Upload
                                </h2>
                                <span className="text-[11px] text-slate-400 font-medium">PDF & DOCX</span>
                            </div>

                            {/* Dropzone Box */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                                    isDragging
                                        ? "border-indigo-500 bg-indigo-600/10"
                                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
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
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-white">Drag & Drop candidate resumes here</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">or <span className="text-indigo-400 underline">browse device</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Files List */}
                            {files.length > 0 && (
                                <div className="mt-4 space-y-2 max-h-36 overflow-y-auto pr-1">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Selected Files ({files.length}):</span>
                                        <button onClick={clearAllFiles} className="text-rose-400 hover:underline">Clear</button>
                                    </div>
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="truncate text-slate-200">{file.name}</span>
                                            </div>
                                            <button onClick={() => removeFile(idx)} className="text-slate-500 hover:text-rose-400 p-1">
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
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                }`}>
                                    {uploadStatus.message}
                                </div>
                            )}
                        </div>

                        {/* Upload Trigger Button */}
                        <button
                            onClick={handleUpload}
                            disabled={uploadLoading || files.length === 0}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {uploadLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Parsing & Indexing Resumes...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Index {files.length > 0 ? `${files.length} File(s)` : "Resumes"}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* RIGHT COLUMN: AI SEARCH BAR & PRESETS (7 cols) */}
                    <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Search className="w-4 h-4 text-indigo-400" />
                                    AI Candidate Search
                                </h2>
                                <span className="text-[11px] text-slate-400">Natural Language Engine</span>
                            </div>

                            {/* Search Box Input */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. Python ML Developer with FastAPI, PyTorch & 8+ CGPA"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSearch()
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-24 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery("")}
                                        className="absolute right-24 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs px-2 py-1"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSearch()}
                                    disabled={searchLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Search</span>
                                </button>
                            </div>

                            {/* Preset Pills */}
                            <div className="space-y-2 pt-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Suggested Candidate Prompts:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_QUERIES.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setQuery(preset)
                                                handleSearch(preset)
                                            }}
                                            className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-medium transition"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quick Analytics Bar CTA */}
                        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Want deeper candidate skill analytics?</span>
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                            >
                                Open Analytics <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CANDIDATE RANKINGS SECTION */}
                <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>Candidate Rankings</span>
                            {resumes.length > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                                    {resumes.length} Candidate(s) Matched
                                </span>
                            )}
                        </h2>
                    </div>

                    {searchLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
                                    <div className="flex justify-between items-center">
                                        <div className="w-32 h-5 bg-slate-800 rounded" />
                                        <div className="w-12 h-6 bg-slate-800 rounded-full" />
                                    </div>
                                    <div className="w-24 h-4 bg-slate-800/60 rounded" />
                                    <div className="w-full h-14 bg-slate-800/40 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : resumes.length === 0 ? (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                                <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-white">
                                {searchAttempted ? "No Matching Candidates Found" : "Search Your Candidates"}
                            </h3>
                            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                                {searchAttempted
                                    ? `No candidates in your workspace matched "${query}". Try searching for specific technical skills like Python, React, Java, or Node.js.`
                                    : "Enter a job requirement prompt above or click a suggested prompt to view ranked candidates."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {resumes.map((resume) => (
                                <div
                                    key={resume._id}
                                    onClick={() => navigate("/candidate", { state: resume })}
                                    className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                                >
                                    <div>
                                        {/* HEADER: AVATAR + NAME + SCORE */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
                                                    {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                                                </div>
                                                <div className="truncate">
                                                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                                                        {resume.name || "Candidate Profile"}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                                        <GraduationCap className="w-3 h-3 text-indigo-400 shrink-0" />
                                                        <span className="truncate">{resume.college || "Graduate"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SCORE BADGE */}
                                            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs shrink-0">
                                                {resume.score ? `${resume.score}` : "N/A"}
                                            </div>
                                        </div>

                                        {/* FOLDER & ROLE BADGES */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                            {resume.folder?.name && (
                                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold flex items-center gap-1">
                                                    📁 {resume.folder.name}
                                                </span>
                                            )}
                                            {resume.roleCategory && (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                                    🏷️ {resume.roleCategory}
                                                </span>
                                            )}
                                        </div>

                                        {/* AI REASON CALLOUT */}
                                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-3 text-xs space-y-1">
                                            <div className="flex items-center gap-1 text-indigo-400 font-semibold text-[11px]">
                                                <Sparkles className="w-3 h-3" />
                                                AI Insight
                                            </div>
                                            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                                                {resume.reason || "Matched based on technical skills and domain alignment."}
                                            </p>
                                        </div>

                                        {/* SKILLS CHIPS */}
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {resume.skills?.slice(0, 6).map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-medium"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* FOOTER CTA */}
                                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-400 transition">
                                        <span>View Full Profile</span>
                                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

export default SearchResume
