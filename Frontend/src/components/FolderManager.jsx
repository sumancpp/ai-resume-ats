import { useState, useEffect } from "react"
import axios from "axios"
import { FolderPlus, Folder, Trash2, Plus, Briefcase, Layers, X, Sparkles } from "lucide-react"

import { getBackendUrl } from "../utils/api"

const COLOR_OPTIONS = [
    { name: "indigo", bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", activeBg: "bg-indigo-600", dot: "bg-indigo-500" },
    { name: "emerald", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", activeBg: "bg-emerald-600", dot: "bg-emerald-500" },
    { name: "amber", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", activeBg: "bg-amber-600", dot: "bg-amber-500" },
    { name: "cyan", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", activeBg: "bg-cyan-600", dot: "bg-cyan-500" },
    { name: "purple", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", activeBg: "bg-purple-600", dot: "bg-purple-500" },
    { name: "rose", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", activeBg: "bg-rose-600", dot: "bg-rose-500" }
]

const FolderManager = ({ activeFolder, setActiveFolder, onFolderChange }) => {
    const [folders, setFolders] = useState([])
    const [totalResumes, setTotalResumes] = useState(0)
    const [unassignedCount, setUnassignedCount] = useState(0)
    const [loading, setLoading] = useState(true)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [folderName, setFolderName] = useState("")
    const [folderDesc, setFolderDesc] = useState("")
    const [selectedColor, setSelectedColor] = useState("indigo")
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    const getApiUrl = (endpoint) => {
        return `${getBackendUrl()}${endpoint}`
    }

    const fetchFolders = async () => {
        const token = localStorage.getItem("talent_ai_token")
        if (!token) return

        try {
            setLoading(true)
            const url = getApiUrl("/folders")
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.data.success) {
                setFolders(res.data.folders || [])
                setTotalResumes(res.data.totalResumes || 0)
                setUnassignedCount(res.data.unassignedCount || 0)
            }
        } catch (err) {
            console.error("Error loading folders:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFolders()
    }, [])

    const handleCreateFolder = async (e) => {
        e.preventDefault()
        if (!folderName.trim()) {
            setErrorMsg("Please enter a folder name")
            return
        }

        const token = localStorage.getItem("talent_ai_token")
        setErrorMsg("")
        setSubmitting(true)

        try {
            const url = getApiUrl("/folders")
            const res = await axios.post(
                url,
                { name: folderName, description: folderDesc, color: selectedColor },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            if (res.data.success) {
                setShowModal(false)
                setFolderName("")
                setFolderDesc("")
                setSelectedColor("indigo")
                fetchFolders()
                setActiveFolder(res.data.folder._id)
                if (onFolderChange) onFolderChange(res.data.folder._id)
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to create folder")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteFolder = async (e, folderId) => {
        e.stopPropagation()
        if (!window.confirm("Are you sure you want to delete this job folder? Resumes will move to General Pool.")) return

        const token = localStorage.getItem("talent_ai_token")
        try {
            const url = getApiUrl(`/folders/${folderId}`)
            await axios.delete(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (activeFolder === folderId) {
                setActiveFolder("all")
                if (onFolderChange) onFolderChange("all")
            }
            fetchFolders()
        } catch (err) {
            console.error("Delete folder error:", err)
        }
    }

    const selectFolder = (id) => {
        setActiveFolder(id)
        if (onFolderChange) onFolderChange(id)
    }

    return (
        <div className="mb-8">
            {/* Header & New Folder Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            Job Role Pools & Folders
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                {folders.length} Active Pools
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400">Organize and search candidates by target role or department</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition duration-200"
                >
                    <FolderPlus className="w-4 h-4" />
                    New Job Folder
                </button>
            </div>

            {/* Folder Tabs Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {/* 1. All Candidates Tab */}
                <button
                    onClick={() => selectFolder("all")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 border ${
                        activeFolder === "all"
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                            : "bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800/80 hover:text-white"
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>All Candidates</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeFolder === "all" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                        {totalResumes}
                    </span>
                </button>

                {/* 2. Custom Folders */}
                {folders.map((folder) => {
                    const colorStyle = COLOR_OPTIONS.find((c) => c.name === folder.color) || COLOR_OPTIONS[0]
                    const isActive = activeFolder === folder._id

                    return (
                        <div key={folder._id} className="relative group shrink-0">
                            <button
                                onClick={() => selectFolder(folder._id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition border ${
                                    isActive
                                        ? `${colorStyle.activeBg} text-white border-white/20 shadow-md`
                                        : `${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} hover:opacity-90`
                                }`}
                            >
                                <Folder className="w-4 h-4 shrink-0" />
                                <span className="max-w-[140px] truncate">{folder.name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isActive ? "bg-white/20 text-white" : "bg-slate-900/40"
                                }`}>
                                    {folder.candidateCount || 0}
                                </span>

                                <button
                                    onClick={(e) => handleDeleteFolder(e, folder._id)}
                                    title="Delete Folder"
                                    className="ml-1 opacity-0 group-hover:opacity-100 hover:text-rose-300 transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </button>
                        </div>
                    )
                })}

                {/* 3. General Pool Tab */}
                <button
                    onClick={() => selectFolder("general")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 border ${
                        activeFolder === "general"
                            ? "bg-slate-700 text-white border-slate-600 shadow-md"
                            : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-white"
                    }`}
                >
                    <Briefcase className="w-4 h-4" />
                    <span>General Pool</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeFolder === "general" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                        {unassignedCount}
                    </span>
                </button>
            </div>

            {/* Modal: New Job Folder */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <FolderPlus className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Create New Job Folder</h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white transition p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateFolder} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Job Role Folder Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mobile App Developers, Web Developers"
                                    value={folderName}
                                    onChange={(e) => setFolderName(e.target.value)}
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Description / Target Tech Stack
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Flutter, React Native, Swift & Kotlin candidates"
                                    value={folderDesc}
                                    onChange={(e) => setFolderDesc(e.target.value)}
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Folder Color Badge
                                </label>
                                <div className="flex items-center gap-2">
                                    {COLOR_OPTIONS.map((c) => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => setSelectedColor(c.name)}
                                            className={`w-8 h-8 rounded-full ${c.dot} flex items-center justify-center transition border-2 ${
                                                selectedColor === c.name ? "border-white scale-110" : "border-transparent opacity-70"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                                >
                                    {submitting ? "Creating..." : "Create Folder"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FolderManager
