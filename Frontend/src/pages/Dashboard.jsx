import { useEffect, useState } from "react"
import axios from "axios"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell
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
    Award
} from "lucide-react"

const Dashboard = () => {
    const [resumes, setResumes] = useState([])
    const [loading, setLoading] = useState(true)
    const [tableSearch, setTableSearch] = useState("")

    const navigate = useNavigate()

    useEffect(() => {
        fetchResumes()
    }, [])

    const fetchResumes = async () => {
        try {
            setLoading(true)
            const apiUrl = import.meta.env.VITE_API_URL || "https://ai-resume-ats-zbbn.onrender.com"
            const response = await axios.get(`${apiUrl}/search?query=`)
            setResumes(response?.data?.resumes || [])
        } catch (error) {
            console.error("Dashboard fetch error:", error)
            setResumes([])
        } finally {
            setLoading(false)
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
        resumes?.filter((r) => r?.college)?.map((r) => r.college)
    ).size

    const skillCount = {}
    resumes?.forEach((resume) => {
        if (resume?.skills?.length > 0) {
            resume.skills.forEach((skill) => {
                const formattedSkill = skill.trim()
                if (skillCount[formattedSkill]) {
                    skillCount[formattedSkill] += 1
                } else {
                    skillCount[formattedSkill] = 1
                }
            })
        }
    })

    const chartData = Object.entries(skillCount)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

    const totalSkillsCount = Object.keys(skillCount).length

    // Filter table list
    const filteredResumes = resumes.filter((r) => {
        if (!tableSearch) return true
        const searchLower = tableSearch.toLowerCase()
        return (
            r.name?.toLowerCase().includes(searchLower) ||
            r.college?.toLowerCase().includes(searchLower) ||
            r.skills?.some((s) => s.toLowerCase().includes(searchLower))
        )
    })

    // Custom Bar Chart Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
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

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-800 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            <BarChart3 className="w-3.5 h-3.5" />
                            Real-time Analytics
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            ATS Talent Intelligence Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            High-level skill distribution, academic metrics, and candidate roster.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold transition-all duration-200 self-start sm:self-auto cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 text-indigo-400" />
                        Back to Resume Matcher
                    </button>
                </div>

                {/* METRICS CARDS (4 GRID) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* CARD 1: TOTAL RESUMES */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Total Resumes
                            </span>
                            <div className="text-3xl font-black text-white">
                                {totalResumes}
                            </div>
                            <span className="text-[11px] text-indigo-400 font-medium">
                                Vector indexed CVs
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>

                    {/* CARD 2: AVG CGPA */}
                    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Average CGPA
                            </span>
                            <div className="text-3xl font-black text-emerald-400">
                                {averageCgpa}
                            </div>
                            <span className="text-[11px] text-emerald-500/80 font-medium">
                                Out of 10.0 scale
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6" />
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
                                Searchable table of all uploaded resume profiles
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
                                    <th className="py-3 px-4">College / University</th>
                                    <th className="py-3 px-4">CGPA</th>
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
                                                {resume.name || "Unnamed Candidate"}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-300">
                                                {resume.college || "N/A"}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-indigo-400">
                                                {resume.cgpa || "N/A"}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {resume.skills?.slice(0, 4).map((skill, sIdx) => (
                                                        <span
                                                            key={sIdx}
                                                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {resume.skills?.length > 4 && (
                                                        <span className="text-[10px] text-slate-500">
                                                            +{resume.skills.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => navigate("/candidate", { state: resume })}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors cursor-pointer"
                                                >
                                                    View Details
                                                    <ChevronRight className="w-3.5 h-3.5" />
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
