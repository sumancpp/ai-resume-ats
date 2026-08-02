import { useEffect, useState } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
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
  UserCheck,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Send,
  Video,
  FileCheck,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  Code2,
  HelpCircle,
  Briefcase,
  AlertCircle,
  ExternalLink
} from "lucide-react"

import { getBackendUrl } from "../utils/api"
import { toast } from "react-hot-toast"

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

  // Candidate Selection State
  const [selectedIds, setSelectedIds] = useState([])

  // Modal Control States
  const [activeModal, setActiveModal] = useState(null) // 'shortlist' | 'exam_config' | 'round1_passed' | 'interview' | 'offer'
  const [targetCandidates, setTargetCandidates] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [openRowDropdown, setOpenRowDropdown] = useState(null)

  // 1. Shortlist Notice Form
  const [shortlistForm, setShortlistForm] = useState({
    scheduledDate: "",
    scheduledTime: "",
    customNotes: ""
  })

  // 2. Exam Configurator Form & Question Editor State
  const [examConfig, setExamConfig] = useState({
    durationMinutes: 15,
    mcqCount: 3,
    codingCount: 2,
    linkExpiryHours: 24,
    roleCategory: "Software Engineering"
  })
  const [examQuestions, setExamQuestions] = useState([])
  const [generatingAiQuestions, setGeneratingAiQuestions] = useState(false)

  // 3. Round 1 Passed Form
  const [round1Form, setRound1Form] = useState({
    scheduledDate: "",
    scheduledTime: "",
    customMeetUrl: ""
  })

  // 4. Video Interview Form
  const [interviewForm, setInterviewForm] = useState({
    scheduledDate: "",
    scheduledTime: "",
    customMeetUrl: ""
  })

  // 5. Offer Letter Form
  const [offerForm, setOfferForm] = useState({
    roleCategory: "Software Engineer",
    ctc: "12 LPA",
    joiningDate: "",
    hrMessage: ""
  })

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

  // Multi-Selection Logic
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredResumes.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredResumes.map((r) => r._id))
    }
  }

  const handleToggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Open Stage Modal helper (Bulk, Individual, or Everyone)
  const openStageModal = (modalType, candidateList = null) => {
    let candidates = candidateList
    if (!candidates) {
      if (selectedIds.length > 0) {
        candidates = resumes.filter((r) => selectedIds.includes(r._id))
      } else {
        candidates = resumes
      }
    }

    if (!candidates || candidates.length === 0) {
      toast.error("No candidate dossiers available to send emails.")
      return
    }
    setTargetCandidates(candidates)
    setActiveModal(modalType)
    setOpenRowDropdown(null)

    // Pre-fill initial defaults
    if (modalType === "exam_config" && examQuestions.length === 0) {
      handleGenerateAiQuestions(candidates[0])
    }
  }

  // -------------------------------------------------------------
  // STAGE 1: Send Shortlist & Assessment Schedule Notice
  // -------------------------------------------------------------
  const handleSendShortlistNotice = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      const resumeIds = targetCandidates.map((c) => c._id)
      const res = await axios.post(
        `${backendUrl}/api/exams/send-shortlist-notice`,
        {
          resumeIds,
          scheduledDate: shortlistForm.scheduledDate,
          scheduledTime: shortlistForm.scheduledTime,
          customNotes: shortlistForm.customNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Shortlist notice sent successfully!")
      setActiveModal(null)
      fetchDashboardData()
    } catch (err) {
      toast.error("Error sending shortlist email: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // -------------------------------------------------------------
  // STAGE 2: AI Exam Generation & Custom Question Editor
  // -------------------------------------------------------------
  const handleGenerateAiQuestions = async (candidateObj) => {
    try {
      setGeneratingAiQuestions(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()
      const cand = candidateObj || targetCandidates[0]

      const res = await axios.post(
        `${backendUrl}/api/exams/generate-custom-questions`,
        {
          resumeId: cand?._id,
          mcqCount: examConfig.mcqCount,
          codingCount: examConfig.codingCount,
          roleCategory: examConfig.roleCategory || cand?.roleCategory
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setExamQuestions(res.data.questions || [])
    } catch (err) {
      toast.error("Error generating AI exam questions: " + (err.response?.data?.message || err.message))
    } finally {
      setGeneratingAiQuestions(false)
    }
  }

  const handleAddCustomMcq = () => {
    const newMcq = {
      id: `q_${Date.now()}`,
      type: "mcq",
      questionText: "Which of the following is true regarding JavaScript event loops?",
      options: [
        "Executes synchronous code first",
        "Executes microtasks before macrotasks",
        "Single-threaded non-blocking execution",
        "All of the above"
      ],
      correctOptionIndex: 3
    }
    setExamQuestions([...examQuestions, newMcq])
  }

  const handleAddCustomCoding = () => {
    const newCoding = {
      id: `q_${Date.now()}`,
      type: "coding",
      questionText: "Problem: Array Element Sum. Given an array of integers arr, return the sum of all elements.",
      starterCode: "function solution(arr) {\n  // Write your solution here\n  return 0;\n}",
      testCases: [
        { input: "[1, 2, 3, 4]", expectedOutput: "10", description: "Sum positive integers" },
        { input: "[-5, 5]", expectedOutput: "0", description: "Sum negative and positive" }
      ]
    }
    setExamQuestions([...examQuestions, newCoding])
  }

  const handleUpdateQuestionText = (index, text) => {
    const updated = [...examQuestions]
    updated[index].questionText = text
    setExamQuestions(updated)
  }

  const handleUpdateMcqOption = (qIdx, optIdx, text) => {
    const updated = [...examQuestions]
    updated[qIdx].options[optIdx] = text
    setExamQuestions(updated)
  }

  const handleUpdateCorrectOption = (qIdx, optIdx) => {
    const updated = [...examQuestions]
    updated[qIdx].correctOptionIndex = optIdx
    setExamQuestions(updated)
  }

  const handleUpdateCodingStarter = (index, code) => {
    const updated = [...examQuestions]
    updated[index].starterCode = code
    setExamQuestions(updated)
  }

  const handleDeleteQuestion = (index) => {
    setExamQuestions(examQuestions.filter((_, i) => i !== index))
  }

  const handleSendConfiguredExam = async () => {
    if (examQuestions.length === 0) {
      toast.error("Please generate or add at least 1 question to the exam first.")
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()
      const resumeIds = targetCandidates.map((c) => c._id)

      const res = await axios.post(
        `${backendUrl}/api/exams/send-configured-exam`,
        {
          resumeIds,
          questions: examQuestions,
          durationMinutes: examConfig.durationMinutes,
          linkExpiryHours: examConfig.linkExpiryHours
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Configured assessment link emailed!")
      setActiveModal(null)
      fetchDashboardData()
    } catch (err) {
      toast.error("Error sending configured exam: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // -------------------------------------------------------------
  // STAGE 3: Send Technical Round 1 Passed & Interview Schedule
  // -------------------------------------------------------------
  const handleSendRound1Passed = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()
      const resumeIds = targetCandidates.map((c) => c._id)

      const res = await axios.post(
        `${backendUrl}/api/exams/send-round1-passed`,
        {
          resumeIds,
          scheduledDate: round1Form.scheduledDate,
          scheduledTime: round1Form.scheduledTime,
          customMeetUrl: round1Form.customMeetUrl
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Round 1 passed email sent!")
      setActiveModal(null)
      fetchDashboardData()
    } catch (err) {
      toast.error("Error sending Round 1 passed email: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // -------------------------------------------------------------
  // STAGE 4: Send Video Interview Join Link Email
  // -------------------------------------------------------------
  const handleSendVideoInterviewInvite = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      let sent = 0
      for (const cand of targetCandidates) {
        await axios.post(
          `${backendUrl}/api/exams/interview-invite/${cand._id}`,
          {
            candidateEmail: cand.email,
            customMeetUrl: interviewForm.customMeetUrl,
            scheduledDate: interviewForm.scheduledDate,
            scheduledTime: interviewForm.scheduledTime
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        sent++
      }

      toast.success(`Successfully sent video interview join link to ${sent} candidate(s)!`)
      setActiveModal(null)
      fetchDashboardData()
    } catch (err) {
      toast.error("Error sending video interview invite: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // -------------------------------------------------------------
  // STAGE 5: Send Selection & Official Offer Letter Email
  // -------------------------------------------------------------
  const handleSendOfferLetter = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()
      const resumeIds = targetCandidates.map((c) => c._id)

      const res = await axios.post(
        `${backendUrl}/api/exams/send-offer-letter`,
        {
          resumeIds,
          roleCategory: offerForm.roleCategory,
          ctc: offerForm.ctc,
          joiningDate: offerForm.joiningDate,
          hrMessage: offerForm.hrMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Offer letter sent successfully!")
      setActiveModal(null)
      fetchDashboardData()
    } catch (err) {
      toast.error("Error sending offer letter email: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // Dashboard Stats Calculations
  const totalResumes = resumes?.length || 0
  const uniqueColleges = new Set(
    resumes?.map((r) => r?.college).filter((c) => c && c.trim() !== "")
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
              <span>Talent Analytics & Stage Communication Portal</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Manage multi-stage hiring actions, custom AI assessments, live candidate scores, and offer letter dispatches
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => openStageModal("everyone", resumes)}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-full flex items-center gap-2 transition cursor-pointer shadow-lg border border-violet-400/30"
            >
              <span>Send Mail to Everyone ({totalResumes})</span>
              <Send className="w-4 h-4 text-violet-200" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/")}
              className="px-4 py-2.5 bg-[#FAF8F5] !text-[#0F1012] font-bold text-xs rounded-full flex items-center gap-2 transition hover:bg-white cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>Editorial Workspace</span>
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

        {/* 5-STAGE RECRUITER EMAIL ACTION TOOLBAR */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#272930] pb-4">
            <div>
              <span className="text-xs font-mono uppercase text-violet-400 tracking-wider font-semibold">
                // Multi-Stage Candidate Communications
              </span>
              <h2 className="font-serif text-2xl text-white flex items-center gap-2 mt-0.5">
                <Mail className="w-5 h-5 text-violet-400" />
                <span>Candidate Recruitment Stage Email Portal</span>
              </h2>
              <p className="text-zinc-400 text-xs mt-1">
                Dispatch stage-specific emails to <strong>{selectedIds.length > 0 ? `${selectedIds.length} Selected Candidates` : "All Candidates"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">
                {selectedIds.length > 0 ? `${selectedIds.length} candidate(s) checked` : "Targeting All Candidates"}
              </span>
            </div>
          </div>

          {/* 5 Stage Mail Action Buttons Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            
            {/* Button 1: Shortlist Notice */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openStageModal("shortlist")}
              className="p-3.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold text-xs flex flex-col items-center text-center gap-2 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center justify-center gap-1.5">
                  <span>1. Shortlist Notice</span>
                  <Send className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Schedule Assessment Date</div>
              </div>
            </motion.button>

            {/* Button 2: Custom & AI Exam Configurator */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openStageModal("exam_config")}
              className="p-3.5 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold text-xs flex flex-col items-center text-center gap-2 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center justify-center gap-1.5">
                  <span>2. Exam Configurator</span>
                  <Send className="w-3 h-3 text-violet-400" />
                </div>
                <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Custom/AI Questions & Time</div>
              </div>
            </motion.button>

            {/* Button 3: Round 1 Clearance & Interview Schedule */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openStageModal("round1_passed")}
              className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex flex-col items-center text-center gap-2 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center justify-center gap-1.5">
                  <span>3. Pass Round 1</span>
                  <Send className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Scores & Jitsi Meet Schedule</div>
              </div>
            </motion.button>

            {/* Button 4: Direct Video Interview Link */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openStageModal("interview")}
              className="p-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex flex-col items-center text-center gap-2 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center justify-center gap-1.5">
                  <span>4. Video Interview Link</span>
                  <Send className="w-3 h-3 text-cyan-400" />
                </div>
                <div className="text-[10px] text-zinc-400 font-normal mt-0.5">Jitsi Meeting Join Link</div>
              </div>
            </motion.button>

            {/* Button 5: Final Offer Letter */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openStageModal("offer")}
              className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs flex flex-col items-center text-center gap-2 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center justify-center gap-1.5">
                  <span>5. Send Offer Letter</span>
                  <Send className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-[10px] text-zinc-400 font-normal mt-0.5">CTC & Selection Offer</div>
              </div>
            </motion.button>

          </div>
        </motion.div>

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
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
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

        {/* CANDIDATES DIRECTORY TABLE WITH SELECTION & INDIVIDUAL MAIL ACTIONS */}
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
                Select candidates individually or in bulk to send multi-stage emails
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
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Select / Deselect All Candidates"
                    >
                      {selectedIds.length > 0 && selectedIds.length === filteredResumes.length ? (
                        <CheckSquare className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Pipeline Status</th>
                  <th className="py-3.5 px-4">Exam Score</th>
                  <th className="py-3.5 px-4">Skills</th>
                  <th className="py-3.5 px-4 text-right">Individual Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252E]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Loading candidate directory...
                    </td>
                  </tr>
                ) : filteredResumes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No candidate dossiers match your search.
                    </td>
                  </tr>
                ) : (
                  filteredResumes.map((resume, idx) => {
                    const isSelected = selectedIds.includes(resume._id)
                    const isDropdownOpen = openRowDropdown === resume._id

                    return (
                      <motion.tr
                        key={resume._id || idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`transition-colors ${isSelected ? "bg-violet-600/10" : "hover:bg-[#1C1E24]"}`}
                      >
                        {/* Checkbox Cell */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleSelectRow(resume._id)}
                            className="text-zinc-400 hover:text-white transition cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-violet-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Candidate Info Cell */}
                        <td className="py-4 px-4 font-semibold text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-300 font-serif font-bold flex items-center justify-center border border-violet-500/30">
                              {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                            </div>
                            <div>
                              <div className="font-serif font-normal text-sm text-white">{resume.name || "Candidate"}</div>
                              <div className="text-[11px] font-sans font-normal text-zinc-400">{resume.email || resume.college || "No Email"}</div>
                            </div>
                          </div>
                        </td>

                        {/* Pipeline Status */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {resume.hiringStatus === "hired" ? (
                              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono rounded-full text-[10px]">
                                🏆 OFFER SENT
                              </span>
                            ) : resume.hiringStatus === "interview_scheduled" ? (
                              <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono rounded-full text-[10px]">
                                📹 INTERVIEW SCHEDULED
                              </span>
                            ) : resume.hiringStatus === "exam_invited" ? (
                              <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono rounded-full text-[10px]">
                                📝 EXAM INVITED
                              </span>
                            ) : resume.isShortlisted ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono rounded-full text-[10px]">
                                ✨ SHORTLISTED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-[#0F1012] text-zinc-400 border border-[#272930] font-mono rounded-full text-[10px]">
                                INDEXED
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Score */}
                        <td className="py-4 px-4 font-mono font-semibold text-violet-300">
                          {resume.examScore !== null && resume.examScore !== undefined ? (
                            <span className="px-2.5 py-1 bg-[#0F1012] border border-[#272930] rounded-full text-xs text-violet-300">
                              {resume.examScore}%
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>

                        {/* Skills */}
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

                        {/* Individual Candidate Actions Dropdown & Direct Join */}
                        <td className="py-4 px-4 text-right relative">
                          <div className="inline-flex items-center gap-2">
                            <a
                              href={`https://meet.jit.si/TalentAI-Interview-${resume._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
                              title="HR Direct Join Live Jitsi Interview Room"
                            >
                              <Video className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Join Jitsi</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </a>

                            <button
                              onClick={() => setOpenRowDropdown(isDropdownOpen ? null : resume._id)}
                              className="px-3 py-1.5 rounded-full bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <span>Send Mail</span>
                              <Send className="w-3.5 h-3.5" />
                              <ChevronDown className="w-3 h-3 ml-0.5" />
                            </button>

                            <button
                              onClick={() => navigate("/candidate", { state: resume })}
                              className="p-1.5 rounded-full bg-[#0F1012] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-[#272930] transition cursor-pointer"
                              title="Inspect Full Candidate Dossier"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Row Dropdown Menu */}
                          {isDropdownOpen && (
                            <div className="absolute right-4 top-12 z-40 w-64 bg-[#16171B] border border-[#272930] rounded-2xl shadow-2xl p-2 space-y-1 text-left font-sans text-xs">
                              <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-400 border-b border-[#272930]">
                                Candidate Stage Mails
                              </div>

                              <button
                                onClick={() => openStageModal("shortlist", [resume])}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-500/10 text-indigo-300 flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>1. Shortlist Notice</span>
                                </div>
                                <Send className="w-3.5 h-3.5 text-indigo-400" />
                              </button>

                              <button
                                onClick={() => openStageModal("exam_config", [resume])}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-violet-500/10 text-violet-300 flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Sliders className="w-3.5 h-3.5 text-violet-400" />
                                  <span>2. Custom AI Exam</span>
                                </div>
                                <Send className="w-3.5 h-3.5 text-violet-400" />
                              </button>

                              <button
                                onClick={() => openStageModal("round1_passed", [resume])}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-500/10 text-emerald-300 flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>3. Pass Round 1 & Schedule</span>
                                </div>
                                <Send className="w-3.5 h-3.5 text-emerald-400" />
                              </button>

                              <button
                                onClick={() => openStageModal("interview", [resume])}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/10 text-cyan-300 flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>4. Send Video Link</span>
                                </div>
                                <Send className="w-3.5 h-3.5 text-cyan-400" />
                              </button>

                              <button
                                onClick={() => openStageModal("offer", [resume])}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500/10 text-amber-300 flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Award className="w-3.5 h-3.5 text-amber-400" />
                                  <span>5. Send Offer Letter</span>
                                </div>
                                <Send className="w-3.5 h-3.5 text-amber-400" />
                              </button>

                              <div className="pt-1 border-t border-[#272930]">
                                <a
                                  href={`https://meet.jit.si/TalentAI-Interview-${resume._id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full px-3 py-2 rounded-xl hover:bg-cyan-500/10 text-cyan-300 flex items-center justify-between transition cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 font-bold">
                                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Join Jitsi Video Room</span>
                                  </div>
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                </a>
                              </div>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SHORTLIST & ASSESSMENT DATE NOTICE */}
      {/* ========================================================================= */}
      {activeModal === "shortlist" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
          <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-[#272930] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white">Shortlist & Assessment Date Email</h3>
                  <p className="text-xs text-zinc-400">Targeting {targetCandidates.length} candidate(s)</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="p-3.5 rounded-2xl bg-[#0F1012] border border-[#272930] text-zinc-300 leading-relaxed">
                <strong>Mail Subject:</strong> ✨ Good News! Your Resume Has Been Shortlisted - Online Assessment Schedule
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Assessment Date *</label>
                  <input
                    type="date"
                    value={shortlistForm.scheduledDate}
                    onChange={(e) => setShortlistForm({ ...shortlistForm, scheduledDate: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Assessment Time *</label>
                  <input
                    type="time"
                    value={shortlistForm.scheduledTime}
                    onChange={(e) => setShortlistForm({ ...shortlistForm, scheduledTime: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">HR Custom Message / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please be ready with a stable internet connection and webcam..."
                  value={shortlistForm.customNotes}
                  onChange={(e) => setShortlistForm({ ...shortlistForm, customNotes: e.target.value })}
                  className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-full text-xs text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendShortlistNotice}
                disabled={actionLoading || !shortlistForm.scheduledDate}
                className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <span>{actionLoading ? "Sending..." : `Send Shortlist Email (${targetCandidates.length})`}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM & AI EXAM CONFIGURATOR & EDITABLE QUESTIONS EDITOR */}
      {/* ========================================================================= */}
      {activeModal === "exam_config" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
          <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#272930] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white">Custom Exam Generator & Live Question Editor</h3>
                  <p className="text-xs text-zinc-400">Configure duration, MCQ/Coding counts, AI generation & manual edits</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exam Parameters Bar */}
            <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-sans">
              <div>
                <label className="block text-zinc-400 font-mono uppercase text-[10px] mb-1">Duration (Min)</label>
                <select
                  value={examConfig.durationMinutes}
                  onChange={(e) => setExamConfig({ ...examConfig, durationMinutes: Number(e.target.value) })}
                  className="w-full bg-[#16171B] border border-[#272930] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                >
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono uppercase text-[10px] mb-1">MCQ Count</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={examConfig.mcqCount}
                  onChange={(e) => setExamConfig({ ...examConfig, mcqCount: Number(e.target.value) })}
                  className="w-full bg-[#16171B] border border-[#272930] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono uppercase text-[10px] mb-1">Coding Count</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={examConfig.codingCount}
                  onChange={(e) => setExamConfig({ ...examConfig, codingCount: Number(e.target.value) })}
                  className="w-full bg-[#16171B] border border-[#272930] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono uppercase text-[10px] mb-1">Link Expiry (Hours)</label>
                <select
                  value={examConfig.linkExpiryHours}
                  onChange={(e) => setExamConfig({ ...examConfig, linkExpiryHours: Number(e.target.value) })}
                  className="w-full bg-[#16171B] border border-[#272930] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                >
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleGenerateAiQuestions()}
                  disabled={generatingAiQuestions}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingAiQuestions ? "Generating..." : "Generate AI"}</span>
                </button>
              </div>
            </div>

            {/* Questions Toolbar */}
            <div className="flex items-center justify-between border-b border-[#272930] pb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-serif font-normal text-white text-base">Questions List ({examQuestions.length})</span>
                <span className="text-zinc-400 text-[11px] font-mono">HR Editable</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddCustomMcq}
                  className="px-3 py-1.5 bg-[#0F1012] hover:bg-zinc-800 text-violet-300 border border-violet-500/30 rounded-full font-medium transition cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Custom MCQ</span>
                </button>

                <button
                  onClick={handleAddCustomCoding}
                  className="px-3 py-1.5 bg-[#0F1012] hover:bg-zinc-800 text-cyan-300 border border-cyan-500/30 rounded-full font-medium transition cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Add Coding Challenge</span>
                </button>
              </div>
            </div>

            {/* Editable Questions Cards List */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {examQuestions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="bg-[#0F1012] border border-[#272930] rounded-2xl p-4 space-y-3 relative font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-300 font-mono font-bold flex items-center justify-center">
                        Q{qIdx + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${q.type === 'coding' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'}`}>
                        {q.type === 'coding' ? 'Coding Challenge' : 'Multiple Choice (MCQ)'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="text-zinc-500 hover:text-rose-400 p-1 transition"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question Text Editor */}
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Question Prompt</label>
                    <textarea
                      rows={2}
                      value={q.questionText}
                      onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                      className="w-full bg-[#16171B] border border-[#272930] rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  {/* MCQ Options Editor */}
                  {q.type === "mcq" && (
                    <div className="space-y-2 pt-1">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">Options (Select radio for correct answer)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options?.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 bg-[#16171B] border border-[#272930] rounded-xl px-2.5 py-1.5">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctOptionIndex === optIdx}
                              onChange={() => handleUpdateCorrectOption(qIdx, optIdx)}
                              className="accent-violet-500 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateMcqOption(qIdx, optIdx, e.target.value)}
                              className="w-full bg-transparent text-xs text-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coding Starter Code Editor */}
                  {q.type === "coding" && (
                    <div className="space-y-2 pt-1">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">JavaScript Starter Code</label>
                      <textarea
                        rows={3}
                        value={q.starterCode}
                        onChange={(e) => handleUpdateCodingStarter(qIdx, e.target.value)}
                        className="w-full bg-[#16171B] border border-[#272930] rounded-xl p-2.5 font-mono text-xs text-emerald-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#272930]">
              <div className="text-xs text-zinc-400">
                Sending customized exam link to <strong>{targetCandidates.length} candidate(s)</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-full text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendConfiguredExam}
                  disabled={actionLoading || examQuestions.length === 0}
                  className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>{actionLoading ? "Sending Invites..." : `Send Configured Exam (${targetCandidates.length})`}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TECHNICAL ROUND 1 PASSED & JITSI INTERVIEW SCHEDULE */}
      {/* ========================================================================= */}
      {activeModal === "round1_passed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
          <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-[#272930] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white">Pass Technical Round 1 & Schedule Interview</h3>
                  <p className="text-xs text-zinc-400">Sends Round 1 clearance notice & Jitsi Meet join link</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Summary List */}
            <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-4 space-y-2 text-xs font-sans">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Selected Candidates & Exam Scores:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {targetCandidates.map((cand) => (
                  <div key={cand._id} className="flex items-center justify-between text-zinc-300">
                    <span>{cand.name} ({cand.email || "No Email"})</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {cand.examScore !== null && cand.examScore !== undefined ? `${cand.examScore}% Score` : "Score Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Interview Date *</label>
                  <input
                    type="date"
                    value={round1Form.scheduledDate}
                    onChange={(e) => setRound1Form({ ...round1Form, scheduledDate: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Interview Time *</label>
                  <input
                    type="time"
                    value={round1Form.scheduledTime}
                    onChange={(e) => setRound1Form({ ...round1Form, scheduledTime: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Jitsi Meet Video Link (Optional override)</label>
                <input
                  type="text"
                  placeholder="https://meet.jit.si/TalentAI-Interview-Room (Auto-generated if empty)"
                  value={round1Form.customMeetUrl}
                  onChange={(e) => setRound1Form({ ...round1Form, customMeetUrl: e.target.value })}
                  className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-full text-xs text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRound1Passed}
                disabled={actionLoading || !round1Form.scheduledDate}
                className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <span>{actionLoading ? "Sending..." : `Send Round 1 Passed Email (${targetCandidates.length})`}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DIRECT ONLINE VIDEO INTERVIEW LINK */}
      {/* ========================================================================= */}
      {activeModal === "interview" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
          <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-[#272930] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white">Direct Video Interview Link Email</h3>
                  <p className="text-xs text-zinc-400">Targeting {targetCandidates.length} candidate(s)</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Scheduled Date *</label>
                  <input
                    type="date"
                    value={interviewForm.scheduledDate}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduledDate: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Scheduled Time *</label>
                  <input
                    type="time"
                    value={interviewForm.scheduledTime}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduledTime: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Jitsi Meet URL (Optional custom room)</label>
                <input
                  type="text"
                  placeholder="https://meet.jit.si/TalentAI-Interview (Auto-generated if left empty)"
                  value={interviewForm.customMeetUrl}
                  onChange={(e) => setInterviewForm({ ...interviewForm, customMeetUrl: e.target.value })}
                  className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-full text-xs text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendVideoInterviewInvite}
                disabled={actionLoading || !interviewForm.scheduledDate}
                className="px-6 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <span>{actionLoading ? "Sending..." : `Send Video Join Link (${targetCandidates.length})`}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: FINAL OFFER LETTER EMAIL */}
      {/* ========================================================================= */}
      {activeModal === "offer" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
          <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-[#272930] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-white">Send Official Offer Letter Email</h3>
                  <p className="text-xs text-zinc-400">Targeting {targetCandidates.length} candidate(s)</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Designation / Role Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full Stack Engineer"
                  value={offerForm.roleCategory}
                  onChange={(e) => setOfferForm({ ...offerForm, roleCategory: e.target.value })}
                  className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Compensation / CTC *</label>
                  <input
                    type="text"
                    placeholder="e.g. 12 LPA or $110,000 / year"
                    value={offerForm.ctc}
                    onChange={(e) => setOfferForm({ ...offerForm, ctc: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">Joining Date *</label>
                  <input
                    type="date"
                    value={offerForm.joiningDate}
                    onChange={(e) => setOfferForm({ ...offerForm, joiningDate: e.target.value })}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-mono uppercase text-[10px] mb-1.5">HR Welcome Message</label>
                <textarea
                  rows={3}
                  placeholder="e.g. We were thoroughly impressed by your performance..."
                  value={offerForm.hrMessage}
                  onChange={(e) => setOfferForm({ ...offerForm, hrMessage: e.target.value })}
                  className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {targetCandidates.length === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const backendUrl = getBackendUrl()
                    const query = new URLSearchParams({
                      roleCategory: offerForm.roleCategory || "",
                      ctc: offerForm.ctc || "",
                      joiningDate: offerForm.joiningDate || "",
                      hrMessage: offerForm.hrMessage || ""
                    }).toString()
                    window.open(`${backendUrl}/api/exams/download-offer-letter/${targetCandidates[0]._id}?${query}`, "_blank")
                  }}
                  disabled={!offerForm.roleCategory}
                  className="px-4 py-2 rounded-full bg-[#0F1012] hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  title="Preview generated PDF offer letter"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Preview PDF</span>
                </button>
              )}
              <div className={`flex items-center gap-3 ${targetCandidates.length > 1 ? "w-full justify-end" : ""}`}>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-full text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendOfferLetter}
                  disabled={actionLoading || !offerForm.roleCategory || !offerForm.joiningDate}
                  className="px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>{actionLoading ? "Sending..." : `Send PDF Offer Letter (${targetCandidates.length})`}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER PORTAL MODAL: SEND MAIL TO EVERYONE */}
      {/* ========================================================================= */}
      {activeModal === "everyone" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
          <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-[#272930] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-white">Send Mail to Everyone</h3>
                  <p className="text-xs text-zinc-400">
                    Dispatching stage communications to all <strong>{resumes.length} candidates</strong> in your indexed talent pool
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                Select Stage Email to Send to All Candidates:
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 1st Mail Option */}
                <button
                  onClick={() => {
                    setTargetCandidates(resumes)
                    setActiveModal("shortlist")
                  }}
                  className="p-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">1st Mail — Shortlist & Online Assessment Date</div>
                      <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                        Notifies all shortlisted candidates with online assessment Date & Time chosen by HR.
                      </div>
                    </div>
                  </div>
                  <Send className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>

                {/* 2nd Mail Option */}
                <button
                  onClick={() => {
                    setTargetCandidates(resumes)
                    setActiveModal("exam_config")
                    if (examQuestions.length === 0) {
                      handleGenerateAiQuestions(resumes[0])
                    }
                  }}
                  className="p-4 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">2nd Mail — AI Exam Configurator & Question Editor</div>
                      <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                        Configure exam duration, MCQ count, coding count, edit AI questions live, and send to everyone.
                      </div>
                    </div>
                  </div>
                  <Send className="w-4 h-4 text-violet-400 shrink-0" />
                </button>

                {/* 3rd Mail Option */}
                <button
                  onClick={() => {
                    setTargetCandidates(resumes)
                    setActiveModal("round1_passed")
                  }}
                  className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">3rd Mail — Pass Technical Round 1 & Jitsi Schedule</div>
                      <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                        Shows live scores and notifies passed candidates with interview Date/Time & Jitsi signup details.
                      </div>
                    </div>
                  </div>
                  <Send className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>

                {/* 4th Mail Option */}
                <button
                  onClick={() => {
                    setTargetCandidates(resumes)
                    setActiveModal("interview")
                  }}
                  className="p-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">4th Mail — Direct Video Interview Link Email</div>
                      <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                        Sends direct Jitsi Meet video interview room links with meeting time & instructions.
                      </div>
                    </div>
                  </div>
                  <Send className="w-4 h-4 text-cyan-400 shrink-0" />
                </button>

                {/* 5th Mail Option */}
                <button
                  onClick={() => {
                    setTargetCandidates(resumes)
                    setActiveModal("offer")
                  }}
                  className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">5th Mail — Official Selection & Offer Letter Email</div>
                      <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                        Form for Designation, CTC/Salary, Joining Date, and HR message for offer letter dispatches.
                      </div>
                    </div>
                  </div>
                  <Send className="w-4 h-4 text-amber-400 shrink-0" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#272930]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-full text-xs text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
