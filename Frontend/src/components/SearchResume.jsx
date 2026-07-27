import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import FolderManager from "./FolderManager"

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

    const navigate = useNavigate()

    const getApiUrl = (endpoint) => {
        const base = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000" : "https://ai-resume-atsp-backend.onrender.com")
        return `${base}${endpoint}`
    }

    const PRESET_QUERIES = [
        "React Frontend Developer with UI/UX skills and modern JS",
        "Python ML & Backend Developer with FastAPI & PyTorch",
        "Full Stack Developer proficient in Node.js, Express & MongoDB",
        "Software Engineer with high CGPA and strong algorithms"
    ]

    // =====================
    // STRICT FILE FILTER (PDF & DOCX ONLY)
    // =====================
    const filterValidFiles = (incomingFiles) => {
        const valid = []
        let invalidCount = 0

        incomingFiles.forEach((file) => {
            const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
            const isPdf = file.type === "application/pdf" || ext === ".pdf"
            const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === ".docx"

            if (isPdf || isDocx) {
                valid.push(file)
            } else {
                invalidCount++
            }
        })

        if (invalidCount > 0) {
            setUploadStatus({
                type: "error",
                message: `${invalidCount} unsupported file(s) rejected! Only PDF (.pdf) and Word (.docx) resumes are allowed.`
            })
        }

        return valid
    }

    // =====================
    // FILE DRAG & DROP HANDLERS
    // =====================
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files)
            const valid = filterValidFiles(selectedFiles)
            setFiles((prev) => [...prev, ...valid])
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files)
            const valid = filterValidFiles(droppedFiles)
            setFiles((prev) => [...prev, ...valid])
        }
    }

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const clearAllFiles = () => {
        setFiles([])
    }

    // =====================
    // UPLOAD RESUMES (USER ISOLATED)
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
            if (activeFolder) {
                formData.append("folderId", activeFolder)
            }

            const url = getApiUrl("/upload")
            const headers = { Authorization: `Bearer ${token}` }

            let response
            try {
                response = await axios.post(url, formData, { headers })
            } catch (err) {
                if (!err.response) {
                    response = await axios.post("https://ai-resume-atsp-backend.onrender.com/upload", formData, { headers })
                } else {
                    throw err
                }
            }

            const { count, duplicatesSkipped, message } = response.data

            let statusMsg = message || `Successfully indexed ${count} resume(s)!`
            if (duplicatesSkipped > 0) {
                statusMsg += ` (${duplicatesSkipped} duplicate resume(s) skipped)`
            }

            setUploadStatus({
                type: count > 0 ? "success" : "warning",
                message: statusMsg
            })
            setFiles([])
            // Refresh search stats
            if (query.trim()) {
                handleSearch()
            }
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
    const handleSearch = async (overrideFolderId) => {
        if (!query.trim()) {
            alert("Please enter a job requirement or skills query")
            return
        }

        const targetFolder = overrideFolderId !== undefined ? overrideFolderId : activeFolder

        try {
            setSearchLoading(true)
            setSearchAttempted(true)

            const url = getApiUrl("/ai-search")
            const headers = { Authorization: `Bearer ${token}` }

            let response
            try {
                response = await axios.get(url, {
                    params: { query, folderId: targetFolder },
                    headers
                })
            } catch (err) {
                if (!err.response) {
                    response = await axios.get("https://ai-resume-atsp-backend.onrender.com/ai-search", {
                        params: { query, folderId: targetFolder },
                        headers
                    })
                } else {
                    throw err
                }
            }

            setResumes(response.data.resumes || [])
            setTotalUserResumes(response.data.totalUserResumes ?? response.data.resumes?.length ?? 0)
        } catch (error) {
            console.error("Search error:", error)
            alert("Semantic AI search failed. Please check your network connection.")
        } finally {
            setSearchLoading(false)
        }
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* HERO BANNER */}
                <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-8 md:p-12 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 max-w-3xl space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" />
                            Next-Gen Resume Screening Engine
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                            AI-Powered Candidate Matcher & ATS
                        </h1>
                        <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                            Upload candidate resumes to your private workspace, express job criteria in natural language, and let vector AI score and rank the best talent instantaneously.
                        </p>
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all duration-200"
                            >
                                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                                Open Talent Analytics
                            </button>
                        </div>
                    </div>
                </div>

                {/* SECTION 0: FOLDER / JOB ROLE POOL MANAGER */}
                <FolderManager
                    activeFolder={activeFolder}
                    setActiveFolder={setActiveFolder}
                    onFolderChange={(folderId) => {
                        if (query.trim()) {
                            handleSearch(folderId)
                        }
                    }}
                />

                {/* SECTION 1: BULK RESUME UPLOAD AREA */}
                <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                        <div>
                            <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                                <Upload className="w-5 h-5 text-indigo-400" />
                                Upload Resumes to Your Workspace
                            </h2>
                            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                                Supported Formats: <span className="text-indigo-300 font-semibold">PDF (.pdf)</span> and <span className="text-indigo-300 font-semibold">Word (.docx)</span>. Duplicates auto-skipped.
                            </p>
                        </div>
                        {files.length > 0 && (
                            <button
                                onClick={clearAllFiles}
                                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                            >
                                Clear All Selected ({files.length})
                            </button>
                        )}
                    </div>

                    {/* DROPZONE */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
                            isDragging
                                ? "border-indigo-500 bg-indigo-600/10 shadow-lg shadow-indigo-500/10"
                                : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90"
                        }`}
                    >
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center space-y-3 pointer-events-none">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                                <Upload className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">
                                    Drag & Drop PDF or DOCX Resumes Here
                                </p>
                                <p className="text-slate-400 text-xs mt-1">
                                    or <span className="text-indigo-400 underline">browse files from your device</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* STATUS NOTIFICATION BANNER */}
                    {uploadStatus && (
                        <div
                            className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
                                uploadStatus.type === "success"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : uploadStatus.type === "warning"
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {uploadStatus.type === "success" ? (
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                )}
                                <span>{uploadStatus.message}</span>
                            </div>
                            <button
                                onClick={() => setUploadStatus(null)}
                                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* FILE PREVIEW GRID */}
                    {files.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                                {files.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs"
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden pr-2">
                                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                            <div className="truncate">
                                                <p className="font-semibold text-slate-200 truncate">{file.name}</p>
                                                <p className="text-slate-500 text-[10px]">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={uploadLoading}
                                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                            >
                                {uploadLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Parsing & Indexing Resumes...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        <span>Index {files.length} Selected Resume(s)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* SECTION 2: SEMANTIC AI SEARCH INPUT */}
                <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                    <div>
                        <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                            <Search className="w-5 h-5 text-indigo-400" />
                            Ask AI / Search Your Uploaded Resumes
                        </h2>
                        <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                            Describe required skills, degree, experience, or role. Vector AI searches only your workspace candidate files.
                        </p>
                    </div>

                    {/* SEARCH INPUT BAR */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                placeholder="e.g. Senior Full Stack Developer proficient in React, Node.js and MongoDB with 8+ CGPA"
                                className="w-full pl-12 pr-4 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searchLoading}
                            className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
                        >
                            {searchLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Matching...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>Ask Vector AI</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* PRESET PROMPTS */}
                    <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Try Quick Candidate Prompts:
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_QUERIES.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setQuery(preset)
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-medium transition-all"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SECTION 3: SEARCH RESULTS & CANDIDATE RANKINGS */}
                <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
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
                                <div
                                    key={n}
                                    className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 animate-pulse"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-32 h-6 bg-slate-800 rounded"></div>
                                        <div className="w-16 h-6 bg-slate-800 rounded-full"></div>
                                    </div>
                                    <div className="w-24 h-4 bg-slate-800/60 rounded"></div>
                                    <div className="w-full h-16 bg-slate-800/40 rounded-xl"></div>
                                </div>
                            ))}
                        </div>
                    ) : resumes.length === 0 ? (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4 max-w-2xl mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                                {totalUserResumes === 0 ? (
                                    <FolderPlus className="w-8 h-8 text-indigo-400" />
                                ) : (
                                    <Search className="w-8 h-8 text-indigo-400" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {totalUserResumes === 0
                                    ? "No Resumes Uploaded Yet"
                                    : searchAttempted
                                    ? "No Candidate Matches Found"
                                    : "Search Your Resumes"}
                            </h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                                {totalUserResumes === 0
                                    ? "Please upload candidate resumes (PDF or DOCX) in the section above. TalentAI will parse and isolate them in your private workspace for instant AI vector search!"
                                    : searchAttempted
                                    ? `No candidates in your workspace matched "${query}". Try searching for broader technical skills or roles.`
                                    : "Enter a job requirement prompt above or click a preset prompt to view AI-ranked candidates."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {resumes.map((resume) => (
                                <div
                                    key={resume._id}
                                    onClick={() => navigate("/candidate", { state: resume })}
                                    className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-6 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                                >
                                    <div>
                                        {/* HEADER: NAME + SCORE */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-base flex items-center justify-center shadow-md shrink-0">
                                                    {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                        {resume.name || "Candidate Profile"}
                                                    </h3>
                                                    <div className="flex items-center space-x-1 text-slate-400 text-xs mt-0.5">
                                                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                        <span className="truncate max-w-[140px]">{resume.college || "University Graduate"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* MATCH SCORE BADGE */}
                                            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-sm shadow-inner shrink-0">
                                                {resume.score ? `${resume.score}` : "N/A"}
                                            </div>
                                        </div>

                                        {/* FOLDER & ROLE CATEGORY BADGES */}
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            {resume.folder?.name && (
                                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold flex items-center gap-1">
                                                    📁 {resume.folder.name}
                                                </span>
                                            )}
                                            {resume.roleCategory && (
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                                                    🏷️ {resume.roleCategory}
                                                </span>
                                            )}
                                        </div>

                                        {/* AI REASON CALLOUT */}
                                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 mb-4 text-xs space-y-1">
                                            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                AI Match Insight
                                            </div>
                                            <p className="text-slate-300 leading-relaxed line-clamp-3">
                                                {resume.reason || "Matched based on technical keyword alignment and background skills."}
                                            </p>
                                        </div>

                                        {/* CGPA */}
                                        <div className="flex items-center justify-between text-xs mb-4 px-1">
                                            <span className="text-slate-400 font-medium">Academic CGPA</span>
                                            <span className="px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-bold">
                                                {resume.cgpa ? `${resume.cgpa}` : "N/A"}
                                            </span>
                                        </div>

                                        {/* SKILLS */}
                                        <div className="flex flex-wrap gap-1.5 mb-6">
                                            {resume.skills?.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CARD FOOTER */}
                                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                                        <span>View Full Profile & PDF</span>
                                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
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
