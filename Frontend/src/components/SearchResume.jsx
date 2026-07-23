import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
    Upload,
    Search,
    FileText,
    Sparkles,
    CheckCircle2,
    X,
    Loader2,
    GraduationCap,
    Award,
    ChevronRight,
    ArrowRight,
    SlidersHorizontal,
    Briefcase
} from "lucide-react"

const SearchResume = () => {
    const [files, setFiles] = useState([])
    const [isDragging, setIsDragging] = useState(false)
    const [query, setQuery] = useState("")
    const [resumes, setResumes] = useState([])
    const [uploadLoading, setUploadLoading] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState(null)

    const navigate = useNavigate()

    const PRESET_QUERIES = [
        "React Frontend Developer with UI/UX skills and modern JS",
        "Python ML & Backend Developer with FastAPI & PyTorch",
        "Full Stack Developer proficient in Node.js, Express & MongoDB",
        "Software Engineer with high CGPA and strong algorithms"
    ]

    // =====================
    // FILE DRAG & DROP HANDLERS
    // =====================

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files)
            setFiles((prev) => [...prev, ...selectedFiles])
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
            const droppedFiles = Array.from(e.dataTransfer.files).filter(
                (file) =>
                    file.type === "application/pdf" ||
                    file.name.endsWith(".pdf") ||
                    file.name.endsWith(".docx")
            )
            setFiles((prev) => [...prev, ...droppedFiles])
        }
    }

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const clearAllFiles = () => {
        setFiles([])
    }

    // =====================
    // UPLOAD RESUMES
    // =====================

    const handleUpload = async () => {
        if (files.length === 0) {
            alert("Please select or drop resumes first")
            return
        }

        try {
            setUploadLoading(true)
            setUploadStatus(null)

            const formData = new FormData()
            for (let i = 0; i < files.length; i++) {
                formData.append("resumes", files[i])
            }

            const response = await axios.post(
                "https://ai-resume-ats-zbbn.onrender.com/upload",
                formData
            )

            setUploadStatus({
                type: "success",
                message: `Successfully indexed ${response.data.count || files.length} resume(s)!`
            })
            setFiles([])
        } catch (error) {
            console.error(error)
            setUploadStatus({
                type: "error",
                message: "Failed to upload resumes. Please try again."
            })
        } finally {
            setUploadLoading(false)
        }
    }

    // =====================
    // SEMANTIC AI SEARCH
    // =====================

    const handleSearch = async () => {
        if (!query.trim()) {
            alert("Please enter a job requirement or skills prompt")
            return
        }

        try {
            setSearchLoading(true)
            const response = await axios.get(
                "https://ai-resume-ats-zbbn.onrender.com/ai-search",
                {
                    params: { query }
                }
            )

            setResumes(response.data.resumes || [])
        } catch (error) {
            console.error(error)
            alert("Semantic search failed. Please check your connection.")
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
                            Upload resumes in bulk, express job candidate criteria in plain natural language, and let vector AI score and rank the best talent instantaneously.
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

                {/* WORKSPACE GRID: UPLOAD + SEARCH */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* UPLOAD SECTION (5 cols) */}
                    <div className="lg:col-span-5 bg-slate-900/70 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">
                                        Upload Resumes
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-400 font-medium">PDF, DOCX</span>
                            </div>

                            <p className="text-slate-400 text-sm mb-6">
                                Index candidate CVs into the AI vector store for semantic matching.
                            </p>

                            {/* DRAG & DROP AREA */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                                    isDragging
                                        ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                                        : "border-slate-700/80 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/60"
                                }`}
                            >
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx"
                                    id="resume-upload-input"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="resume-upload-input"
                                    className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                                >
                                    <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-indigo-400 hover:underline">
                                            Click to browse files
                                        </span>
                                        <span className="text-sm text-slate-400"> or drag & drop</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Upload single or multiple resumes at once
                                    </p>
                                </label>
                            </div>

                            {/* SELECTED FILES LIST PREVIEW */}
                            {files.length > 0 && (
                                <div className="mt-5 space-y-3">
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                        <span>Selected Resumes ({files.length})</span>
                                        <button
                                            onClick={clearAllFiles}
                                            className="text-rose-400 hover:underline cursor-pointer"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                                        {files.map((file, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
                                            >
                                                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                                    <span className="truncate text-slate-200 font-medium">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-slate-500 shrink-0">
                                                        ({formatFileSize(file.size)})
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(idx)}
                                                    className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* UPLOAD STATUS NOTIFICATION */}
                            {uploadStatus && (
                                <div
                                    className={`mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                                        uploadStatus.type === "success"
                                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                                            : "bg-rose-950/40 text-rose-300 border-rose-800/60"
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{uploadStatus.message}</span>
                                </div>
                            )}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            onClick={handleUpload}
                            disabled={uploadLoading || files.length === 0}
                            className={`mt-6 w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer ${
                                uploadLoading || files.length === 0
                                    ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.99]"
                            }`}
                        >
                            {uploadLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    Parsing & Vectorizing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Upload & Parse Resumes
                                </>
                            )}
                        </button>
                    </div>

                    {/* SEARCH SECTION (7 cols) */}
                    <div className="lg:col-span-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Semantic AI Search
                                    </h2>
                                </div>
                            </div>

                            <p className="text-slate-400 text-sm mb-5">
                                Describe your ideal candidate requirement. The AI vector engine matches concepts, skills, and background.
                            </p>

                            {/* QUERY TEXTAREA */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <textarea
                                        rows={4}
                                        placeholder="e.g. Looking for a Frontend Developer with React, Tailwind CSS, UI design expertise, and high academic score..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none transition-all duration-200"
                                    />
                                    {query && (
                                        <button
                                            onClick={() => setQuery("")}
                                            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-1 text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* PRESET QUICK CHIPS */}
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 block mb-2">
                                        Quick requirement presets:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_QUERIES.map((preset, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setQuery(preset)}
                                                className="text-xs bg-slate-800/80 hover:bg-indigo-950/60 text-slate-300 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 rounded-lg px-3 py-1.5 transition-all duration-200 text-left"
                                            >
                                                + {preset.substring(0, 36)}...
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEARCH SUBMIT BUTTON */}
                        <button
                            onClick={handleSearch}
                            disabled={searchLoading}
                            className={`mt-6 w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer ${
                                searchLoading
                                    ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed"
                                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/25 active:scale-[0.99]"
                            }`}
                        >
                            {searchLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    Searching Vector Database...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    Execute Semantic AI Search
                                </>
                            )}
                        </button>
                    </div>

                </div>

                {/* CANDIDATE RESULTS SECTION */}
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                                <Briefcase className="w-6 h-6 text-indigo-400" />
                                Candidate Matches
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                {resumes.length > 0
                                    ? `Showing top ${resumes.length} matched candidates for your criteria`
                                    : "Run a semantic search to discover matching talent"}
                            </p>
                        </div>
                        {resumes.length > 0 && (
                            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                                {resumes.length} Candidate(s) Found
                            </span>
                        )}
                    </div>

                    {/* SEARCH RESULTS LIST / EMPTY STATE */}
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
                                    <div className="flex gap-2">
                                        <div className="w-12 h-6 bg-slate-800/80 rounded-full"></div>
                                        <div className="w-16 h-6 bg-slate-800/80 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : resumes.length === 0 ? (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4 max-w-2xl mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto border border-slate-700/60">
                                <Search className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">No candidates matched yet</h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto">
                                Enter a query in the Semantic AI Search box above or click one of the quick presets to view ranked candidates.
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
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{resume.college || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* MATCH SCORE BADGE */}
                                            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-sm shadow-inner shrink-0">
                                                {resume.score ? `${resume.score}` : "N/A"}
                                            </div>
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
