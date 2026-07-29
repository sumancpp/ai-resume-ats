import { useEffect, useState } from "react"
import axios from "axios"
import { motion } from "framer-motion"
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
  Building2,
  Sparkles,
  ArrowLeft,
  Search,
  ChevronRight,
  Award,
  Mail,
  UserCheck
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#16171B] border border-[#272930] rounded-xl p-3 shadow-2xl text-xs space-y-1 font-sans">
        <p className="font-serif italic font-bold text-white text-sm">{label}</p>
        <p className="text-violet-400 font-mono">
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
    return () => { isMounted = false }
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

  const totalResumes = resumes?.length || 0

  const uniqueColleges = new Set(
    resumes
      ?.map((r) => r?.college)
      .filter((c) => c && c.trim() !== "")
  ).size

  const shortlistedCandidatesCount = resumes?.filter((r) => r.isShortlisted).length || 0

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
    <div className="min-h-[calc(100vh-5rem)] bg-[#0F1012] text-[#F9F8F6] p-4 md:p-8 lg:p-12 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* DASHBOARD HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23252E] pb-6"
        >
          <div className="space-y-2">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Resume Search</span>
            </button>
            <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-violet-400" />
              <span>Talent Analytics & Editorial Dashboard</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Overview of candidate pool, AI assessments, shortlists, and technical skill metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSendBatchExamInvites}
              disabled={sendingBatch}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-full flex items-center gap-2 shadow-md cursor-pointer transition"
            >
              <Mail className="w-4 h-4" />
              <span>{sendingBatch ? "Sending AI Exams..." : `Mail All Shortlisted (${shortlistedCandidatesCount})`}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/")}
              className="px-4 py-2.5 bg-[#FAF8F5] !text-[#0F1012] font-bold text-xs rounded-full flex items-center gap-2 transition hover:bg-white cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>Editorial Matcher</span>
            </motion.button>
          </div>
        </motion.div>

        {/* METRICS CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {[
            { title: "Total Candidate Dossiers", val: totalResumes, label: "Indexed Talent Pool", icon: FileText, color: "violet" },
            { title: "Shortlisted Candidates", val: shortlistedCandidatesCount, label: "Ready for Assessment", icon: UserCheck, color: "emerald" },
            { title: "Academic Institutions", val: uniqueColleges, label: "Unique Universities", icon: Building2, color: "amber" },
            { title: "Skill Tags Identified", val: totalSkillsCount, label: "Unique Tech Stacks", icon: Award, color: "violet" }
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 shadow-xl flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    {item.title}
                  </span>
                  <div className="font-serif text-3xl font-normal text-white">
                    {item.val}
                  </div>
                  <span className={`text-[11px] font-mono text-${item.color}-400`}>
                    {item.label}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
              </motion.div>
            )
          })}

        </div>

        {/* CHART CONTAINER */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 md:p-8 shadow-xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#272930] pb-4">
            <div>
              <h2 className="font-serif text-2xl text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span>Top Candidate Skill Frequency</span>
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                Distribution of candidate technical capabilities evaluated by Gemini AI
              </p>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="w-full h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="skillBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#23252E" vertical={false} />
                  <XAxis
                    dataKey="skill"
                    stroke="#71717A"
                    tick={{ fill: '#A1A1AA', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717A"
                    tick={{ fill: '#A1A1AA', fontSize: 12 }}
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
                  <Bar
                    dataKey="count"
                    fill="url(#skillBarGradient)"
                    radius={[8, 8, 0, 0]}
                    barSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-zinc-500 text-sm space-y-2">
              <BarChart3 className="w-8 h-8 text-zinc-600" />
              <span>No candidate skill data available yet.</span>
            </div>
          )}
        </motion.div>

        {/* CANDIDATES DIRECTORY TABLE */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 md:p-8 shadow-xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#272930] pb-4">
            <div>
              <h2 className="font-serif text-2xl text-white">Indexed Candidate Directory</h2>
              <p className="text-zinc-400 text-xs mt-1">
                Searchable directory of all candidate dossiers & recruitment statuses
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter by name, college or skill..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-[#0F1012] border border-[#272930] rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
              <thead>
                <tr className="border-b border-[#272930] text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Pipeline Status</th>
                  <th className="py-3.5 px-4">Exam Score</th>
                  <th className="py-3.5 px-4">Skills</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252E]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      Loading candidate directory...
                    </td>
                  </tr>
                ) : filteredResumes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No candidate dossiers match your search.
                    </td>
                  </tr>
                ) : (
                  filteredResumes.map((resume, idx) => (
                    <motion.tr
                      key={resume._id || idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="hover:bg-[#1C1E24] transition-colors"
                    >
                      <td className="py-4 px-4 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-300 font-serif font-bold flex items-center justify-center border border-violet-500/30">
                            {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <div className="font-serif font-normal text-sm text-white">{resume.name || "Candidate"}</div>
                            <div className="text-[11px] font-sans font-normal text-zinc-400">{resume.college || "University"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          {resume.isShortlisted ? (
                            <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono rounded-full text-[10px]">
                              SHORTLISTED
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 bg-[#0F1012] text-zinc-400 border border-[#272930] font-mono rounded-full text-[10px]">
                              INDEXED
                            </span>
                          )}
                          {resume.hiringStatus === "hired" && (
                            <span className="px-3 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono rounded-full text-[10px]">
                              HIRED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-semibold text-violet-300">
                        {resume.examScore !== null && resume.examScore !== undefined ? (
                          <span className="px-2.5 py-1 bg-[#0F1012] border border-[#272930] rounded-full text-xs text-violet-300">
                            {resume.examScore}%
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {resume.skills && resume.skills.length > 0 ? (
                            resume.skills.slice(0, 3).map((sk, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-0.5 rounded-full bg-[#0F1012] text-zinc-300 text-[10px] border border-[#272930]"
                              >
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => navigate("/candidate", { state: resume })}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#0F1012] hover:bg-zinc-800 text-violet-300 border border-violet-500/30 font-medium transition cursor-pointer"
                        >
                          <span>Inspect Dossier</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

export default Dashboard
