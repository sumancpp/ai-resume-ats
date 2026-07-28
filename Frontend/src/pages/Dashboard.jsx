import { useEffect, useState } from "react"
import axios from "axios"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts"
import { useNavigate } from "react-router-dom"
import {
    BarChart3,
    FileText,
    GraduationCap,
    Building2,
    Sparkles,
    ArrowLeft,
    Search,
    ChevronRight,
    Award,
    Mail,
    UserCheck,
    Send
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

// Custom Bar Chart Tooltip
function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                <p className="font-bold text-white">{label}</p>
                <p className="text-indigo-400">
                    Candidate Count: <span className="font-semibold text-white">{payload[0].value}</span>
                </p>
            </div>
        )
    }
    return null
}

const Dashboard = () => {
    const [resumes, setResumes] = useState([])
    const [loading, setLoading] = useState(true)
    const [tableSearch, setTableSearch] = useState("")
    const [sendingBatch, setSendingBatch] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        let isMounted = true
        fetchDashboardData(isMounted)
        const interval = setInterval(() => {
            fetchDashboardData(isMounted)
        }, 5000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [])

    const fetchDashboardData = async (isMounted = true) => {
        const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const getApiUrl = (endpoint) => {
            return `${getBackendUrl()}${endpoint}`
        }

        try {
            const url = getApiUrl("/search?query=")
            const res = await axios.get(url, { headers })
            if (isMounted) {
                setResumes(res?.data?.resumes || [])
                setLoading(false)
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error)
            if (isMounted) {
                setResumes([])
                setLoading(false)
            }
        }
    }

    const handleSendBatchExamInvites = async () => {
        const shortlistedCount = resumes.filter((r) => r.isShortlisted).length
        if (shortlistedCount === 0) {
            alert("No shortlisted candidates found. Please shortlist candidate CVs first by clicking '+ Shortlist' on their details page.")
            return
        }

        if (!confirm(`Are you sure you want to generate AI exams and send email invites to all ${shortlistedCount} shortlisted candidates?`)) {
            return
        }

        setSendingBatch(true)
        try {
            const backendUrl = getBackendUrl()
            const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
            const res = await axios.post(
                `${backendUrl}/api/exams/invite-batch`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            )

            alert(res.data.message)
            fetchDashboardData(true)
        } catch (err) {
            alert("Error sending batch invites: " + (err.response?.data?.message || err.message))
        } finally {
            setSendingBatch(false)
        }
    }

    // =====================
    // COMPUTED METRICS
    // =====================
    const totalResumes = resumes?.length || 0

    const averageCgpa =
        resumes?.length > 0
            ? (
                  resumes.reduce((acc, curr) => acc + (curr?.cgpa || 0), 0) /
                  resumes.length
              ).toFixed(2)
            : "0.00"

    const uniqueColleges = new Set(
        resumes
            ?.map((r) => r?.college)
            .filter((c) => c && c.trim() !== "")
    ).size

    const shortlistedCandidatesCount = resumes?.filter((r) => r.isShortlisted).length || 0

    // SKILLS FREQUENCY MAP
    const skillCounts = {}
    resumes?.forEach((r) => {
        if (Array.isArray(r.skills)) {
            r.skills.forEach((sk) => {
                if (sk) {
                    const normSkill = sk.trim()
                    skillCounts[normSkill] = (skillCounts[normSkill] || 0) + 1
                }
            })
        }
    })

    const totalSkillsCount = Object.keys(skillCounts).length

    const chartData = Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

    const filteredResumes = resumes?.filter((r) => {
        if (!tableSearch) return true
        const search = tableSearch.toLowerCase()
        return (
            (r.name && r.name.toLowerCase().includes(search)) ||
            (r.college && r.college.toLowerCase().includes(search)) ||
            (r.skills && r.skills.some((s) => s.toLowerCase().includes(search)))
        )
    })

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* DASHBOARD HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate("/")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-2 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Resume Matcher
                        </button>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-indigo-500" />
                            Talent Analytics & Hiring Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Overview of candidate pool, AI exams, shortlists, and technical skill metrics
                        </p>
                    </div>

                    {/* BATCH ACTION BUTTON */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSendBatchExamInvites}
                            disabled={sendingBatch}
                            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
                        >
                            <Mail className="w-4 h-4" />
                            {sendingBatch ? "Sending AI Exams..." : `Mail All Shortlisted (${shortlistedCandidatesCount})`}
                        </button>

                        <button
                            onClick={() => navigate("/")}
                            className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            AI Matcher
                        </button>
                    </div>
                </div>

                {/* METRICS CARDS GRID (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* CARD 1: TOTAL CANDIDATES */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Total Resumes
                            </span>
                            <div className="text-3xl font-black text-white">
                                {totalResumes}
                            </div>
                            <span className="text-[11px] text-indigo-400 font-medium">
                                Active Candidate Pool
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>

                    {/* CARD 2: SHORTLISTED CANDIDATES */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Shortlisted
                            </span>
                            <div className="text-3xl font-black text-emerald-400">
                                {shortlistedCandidatesCount}
                            </div>
                            <span className="text-[11px] text-emerald-400/80 font-medium">
                                Ready for Technical Exam
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                            <UserCheck className="w-6 h-6" />
                        </div>
                    </div>

                    {/* CARD 3: UNIQUE COLLEGES */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Institutions
                            </span>
                            <div className="text-3xl font-black text-violet-400">
                                {uniqueColleges}
                            </div>
                            <span className="text-[11px] text-violet-400/80 font-medium">
                                Unique Universities
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                            <Building2 className="w-6 h-6" />
                        </div>
                    </div>

                    {/* CARD 4: TOTAL SKILLS */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Skill Variants
                            </span>
                            <div className="text-3xl font-black text-amber-400">
                                {totalSkillsCount}
                            </div>
                            <span className="text-[11px] text-amber-400/80 font-medium">
                                Extracted tech stacks
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                            <Award className="w-6 h-6" />
                        </div>
                    </div>

                </div>

                {/* CHART CONTAINER */}
                <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                Top Skill Frequency Analysis
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">
                                Distribution of key candidate skills identified by the AI resume parser
                            </p>
                        </div>
                    </div>

                    {chartData.length > 0 ? (
                        <div className="w-full h-[360px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="skillBarGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#4338ca" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="skill"
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        allowDecimals={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                                    <Bar
                                        dataKey="count"
                                        fill="url(#skillBarGradient)"
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[240px] text-slate-500 text-sm space-y-2">
                            <BarChart3 className="w-8 h-8 text-slate-600" />
                            <span>No candidate skill data available yet.</span>
                        </div>
                    )}
                </div>

                {/* CANDIDATES QUICK ACCESS TABLE */}
                <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">Indexed Candidates Directory</h2>
                            <p className="text-slate-400 text-xs mt-1">
                                Searchable table of all uploaded resume profiles & recruitment status
                            </p>
                        </div>

                        {/* TABLE SEARCH BAR */}
                        <div className="relative min-w-[240px]">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                type="text"
                                placeholder="Filter by name, college or skill..."
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300 border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
                                    <th className="py-3 px-4">Candidate Name</th>
                                    <th className="py-3 px-4">Status & Shortlist</th>
                                    <th className="py-3 px-4">Exam Score</th>
                                    <th className="py-3 px-4">Extracted Skills</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">
                                            Loading candidates database...
                                        </td>
                                    </tr>
                                ) : filteredResumes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">
                                            No candidates found matching your filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResumes.map((resume, idx) => (
                                        <tr
                                            key={resume._id || idx}
                                            className="hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="py-3.5 px-4 font-semibold text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30">
                                                        {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                                                    </div>
                                                    <div>
                                                        <div>{resume.name || "Candidate"}</div>
                                                        <div className="text-[11px] font-normal text-slate-400">{resume.college || "University"}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    {resume.isShortlisted ? (
                                                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-full text-[10px]">
                                                            SHORTLISTED
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[10px]">
                                                            Indexed
                                                        </span>
                                                    )}
                                                    {resume.hiringStatus === "hired" && (
                                                        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold rounded-full text-[10px]">
                                                            HIRED
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 font-semibold text-indigo-300">
                                                {resume.examScore !== null && resume.examScore !== undefined ? (
                                                    <span className="px-2 py-1 bg-indigo-950 border border-indigo-800/60 rounded text-xs font-bold text-indigo-300">
                                                        {resume.examScore}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-[11px]">—</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {resume.skills && resume.skills.length > 0 ? (
                                                        resume.skills.slice(0, 3).map((sk, sIdx) => (
                                                            <span
                                                                key={sIdx}
                                                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700/60"
                                                            >
                                                                {sk}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-slate-500 text-[11px]">—</span>
                                                    )}
                                                    {resume.skills && resume.skills.length > 3 && (
                                                        <span className="text-slate-500 text-[10px]">
                                                            +{resume.skills.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => navigate("/candidate", { state: resume })}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors cursor-pointer"
                                                >
                                                    View Profile
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Dashboard
