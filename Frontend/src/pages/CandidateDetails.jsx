import { useState, useEffect } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Document, Page, pdfjs } from "react-pdf"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  GraduationCap,
  Award,
  Sparkles,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Mail,
  Send,
  Video,
  UserCheck,
  RefreshCw,
  FileCheck,
  Trash2,
  Calendar,
  Clock,
  X,
  Sliders,
  Plus,
  Edit3,
  Code2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react"

import InterviewModal from "../components/InterviewModal"
import ConfirmModal from "../components/ConfirmModal"
import { getBackendUrl } from "../utils/api"
import { toast } from "react-hot-toast"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
pdfjs.GlobalWorkerOptions.standardFontDataUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`

const CandidateDetails = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeId } = useParams()
  const [searchParams] = useSearchParams()

  const initialResume = location.state
  const candidateId = routeId || searchParams.get("id") || (initialResume?._id) || localStorage.getItem("talent_ai_active_candidate_id")

  const [resume, setResume] = useState(initialResume)
  const [loadingCandidate, setLoadingCandidate] = useState(!initialResume && Boolean(candidateId))
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pdfError, setPdfError] = useState(false)
  const [viewMode, setViewMode] = useState("canvas") // 'canvas' | 'native' | 'text'

  // Recruitment Action States
  const [candidateEmail, setCandidateEmail] = useState(initialResume?.email || "")
  const [actionLoading, setActionLoading] = useState(false)
  const [deletingResume, setDeletingResume] = useState(false)
  const [examData, setExamData] = useState(null)
  const [isInterviewOpen, setIsInterviewOpen] = useState(false)

  // 5 STAGE ACTION MODAL STATES
  const [activeModal, setActiveModal] = useState(null) // 'shortlist' | 'exam_config' | 'round1_passed' | 'interview' | 'offer'

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

  // Save active candidate ID to localStorage for seamless refresh persistence
  useEffect(() => {
    if (resume?._id) {
      localStorage.setItem("talent_ai_active_candidate_id", resume._id)
    }
  }, [resume?._id])

  // Fetch candidate details by ID on refresh or fallback to latest candidate in workspace
  useEffect(() => {
    if (!resume && candidateId) {
      fetchCandidateById(candidateId)
    } else if (!resume && !candidateId) {
      fetchLatestCandidate()
    }
  }, [candidateId, resume])

  const fetchCandidateById = async (id) => {
    try {
      setLoadingCandidate(true)
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.get(`${backendUrl}/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success && res.data.resume) {
        setResume(res.data.resume)
        setCandidateEmail(res.data.resume.email || "")
      }
    } catch (err) {
      console.error("Fetch candidate by ID error:", err)
    } finally {
      setLoadingCandidate(false)
    }
  }

  const fetchLatestCandidate = async () => {
    try {
      setLoadingCandidate(true)
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.get(`${backendUrl}/resumes`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success && res.data.resumes && res.data.resumes.length > 0) {
        const first = res.data.resumes[0]
        setResume(first)
        setCandidateEmail(first.email || "")
      }
    } catch (err) {
      console.error("Fetch latest candidate error:", err)
    } finally {
      setLoadingCandidate(false)
    }
  }

  useEffect(() => {
    if (!candidateEmail && resume?.resumeText) {
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
      const matches = resume.resumeText.match(emailRegex)
      if (matches && matches.length > 0) {
        const autofetched = matches.find(e => !e.toLowerCase().includes("example.com")) || matches[0]
        if (autofetched) {
          setCandidateEmail(autofetched.toLowerCase().trim())
        }
      }
    }
  }, [candidateEmail, resume?.resumeText])

  useEffect(() => {
    if (resume?._id) {
      setPdfError(false)
      fetchExamData()
    }
  }, [resume?._id])

  const fetchExamData = async () => {
    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.get(`${backendUrl}/api/exams/resume/${resume._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success && res.data.exam) {
        setExamData(res.data.exam)
        setResume((prev) => ({
          ...prev,
          examStatus: res.data.exam.status,
          examScore: res.data.exam.score,
          interviewStatus: res.data.exam.interviewStatus || prev.interviewStatus
        }))
      }
    } catch (err) {
      // Exam record not generated yet
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteResume = () => {
    setShowDeleteConfirm(true)
  }

  const executeDeleteResume = async () => {
    setDeletingResume(true)
    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      await axios.delete(`${backendUrl}/resumes/${resume._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      localStorage.removeItem("talent_ai_candidate_id")
      toast.success("Resume removed from database permanently.")
      setShowDeleteConfirm(false)
      navigate("/")
    } catch (err) {
      toast.error("Error deleting resume: " + (err.response?.data?.message || err.message))
    } finally {
      setDeletingResume(false)
    }
  }

  // -------------------------------------------------------------
  // STAGE HANDLERS FOR INDIVIDUAL CANDIDATE
  // -------------------------------------------------------------
  const handleOpenStageModal = (modalType) => {
    setActiveModal(modalType)
    if (modalType === "exam_config" && examQuestions.length === 0) {
      handleGenerateAiQuestions()
    }
  }

  // Stage 1: Shortlist Notice
  const handleSendShortlistNotice = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      const res = await axios.post(
        `${backendUrl}/api/exams/send-shortlist-notice`,
        {
          resumeIds: [resume._id],
          scheduledDate: shortlistForm.scheduledDate,
          scheduledTime: shortlistForm.scheduledTime,
          customNotes: shortlistForm.customNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Shortlist notice sent successfully!")
      setActiveModal(null)
      setResume((prev) => ({ ...prev, isShortlisted: true, hiringStatus: "shortlisted" }))
    } catch (err) {
      toast.error("Error sending shortlist email: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // Stage 2: AI Exam Configurator & Editor
  const handleGenerateAiQuestions = async () => {
    try {
      setGeneratingAiQuestions(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      const res = await axios.post(
        `${backendUrl}/api/exams/generate-custom-questions`,
        {
          resumeId: resume._id,
          mcqCount: examConfig.mcqCount,
          codingCount: examConfig.codingCount,
          roleCategory: examConfig.roleCategory || resume.roleCategory
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
    setExamQuestions([
      ...examQuestions,
      {
        id: Date.now(),
        type: "mcq",
        question: "Custom Technical Question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctOption: 0
      }
    ])
  }

  const handleAddCustomCoding = () => {
    setExamQuestions([
      ...examQuestions,
      {
        id: Date.now(),
        type: "coding",
        title: "Algorithmic Challenge",
        description: "Write a function to solve the problem.",
        initialCode: "// Write solution here\nfunction solution() {\n\n}",
        testCases: [{ input: "[1, 2, 3]", expectedOutput: "6" }]
      }
    ])
  }

  const handleRemoveQuestion = (index) => {
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

      const res = await axios.post(
        `${backendUrl}/api/exams/send-configured-exam`,
        {
          resumeIds: [resume._id],
          questions: examQuestions,
          durationMinutes: examConfig.durationMinutes,
          linkExpiryHours: examConfig.linkExpiryHours,
          candidateEmailOverrides: { [resume._id]: candidateEmail }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Configured assessment link emailed!")
      setActiveModal(null)
      setResume((prev) => ({ ...prev, isShortlisted: true, examStatus: "invited", hiringStatus: "exam_invited" }))
      fetchExamData()
    } catch (err) {
      toast.error("Error sending configured exam: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // Stage 3: Technical Round 1 Passed & Interview Schedule
  const handleSendRound1Passed = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      const res = await axios.post(
        `${backendUrl}/api/exams/send-round1-passed`,
        {
          resumeIds: [resume._id],
          scheduledDate: round1Form.scheduledDate,
          scheduledTime: round1Form.scheduledTime,
          customMeetUrl: round1Form.customMeetUrl
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Round 1 passed email sent!")
      setActiveModal(null)
      setResume((prev) => ({ ...prev, hiringStatus: "interview_scheduled" }))
      fetchExamData()
    } catch (err) {
      toast.error("Error sending Round 1 passed email: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // Stage 4: Direct Video Interview Link
  const handleSendVideoInterviewInvite = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      const res = await axios.post(
        `${backendUrl}/api/exams/interview-invite/${resume._id}`,
        {
          candidateEmail,
          customMeetUrl: interviewForm.customMeetUrl,
          scheduledDate: interviewForm.scheduledDate,
          scheduledTime: interviewForm.scheduledTime
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Video interview invite sent!")
      setActiveModal(null)
      setResume((prev) => ({ ...prev, hiringStatus: "interview_scheduled" }))
      fetchExamData()
    } catch (err) {
      toast.error("Error sending video interview invite: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  // Stage 5: Final Offer Letter
  const handleSendOfferLetter = async () => {
    try {
      setActionLoading(true)
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const backendUrl = getBackendUrl()

      const res = await axios.post(
        `${backendUrl}/api/exams/send-offer-letter`,
        {
          resumeIds: [resume._id],
          roleCategory: offerForm.roleCategory,
          ctc: offerForm.ctc,
          joiningDate: offerForm.joiningDate,
          hrMessage: offerForm.hrMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(res.data.message || "Offer letter sent successfully!")
      setActiveModal(null)
      setResume((prev) => ({ ...prev, hiringStatus: "hired" }))
    } catch (err) {
      toast.error("Error sending offer letter email: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  if (loadingCandidate) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#0F1012] flex flex-col items-center justify-center p-6 text-center text-[#F9F8F6]">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 text-xs">Loading Candidate Dossier & Resume Document...</p>
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0F1012] flex flex-col items-center justify-center p-6 text-center text-[#F9F8F6]">
        <div className="w-16 h-16 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl text-white mb-2">No Candidate Dossier Selected</h2>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-md mb-6 font-sans">
          Please search and select a candidate from the Candidate Pool to inspect details.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FAF8F5] !text-[#0F1012] font-bold text-xs shadow-xl hover:bg-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Candidate Search</span>
        </button>
      </div>
    )
  }

  const backendBase = getBackendUrl()
  const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token") || ""
  const pdfUrl = resume?._id
    ? `${backendBase}/resumes/${resume._id}/file?token=${encodeURIComponent(token)}`
    : null

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPdfError(false)
  }

  const onDocumentLoadError = (err) => {
    console.error("PDF Load Error:", err)
    setPdfError(true)
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0F1012] text-[#F9F8F6] p-4 sm:p-6 lg:p-10 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP NAVIGATION BAR */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23252E] pb-4"
        >
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white px-4 py-2 rounded-full bg-[#16171B] border border-[#272930] hover:border-zinc-500 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-violet-400" />
            <span>Back to Candidate List</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://meet.jit.si/TalentAI-Interview-${resume._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer shadow-lg"
              title="HR Direct Join Live Jitsi Interview Room"
            >
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Join Jitsi Interview</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <button
              onClick={handleDeleteResume}
              disabled={deletingResume}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deletingResume ? "Deleting..." : "Delete Candidate CV"}</span>
            </button>

            {pdfUrl && !pdfError && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Raw Document</span>
              </a>
            )}
          </div>
        </motion.div>

        {/* MAIN 2-COLUMN DOSSIER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: CANDIDATE SUMMARY & 5 STAGE MAIL ACTIONS */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 space-y-6"
          >
            {/* DOSSIER CARD */}
            <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-serif font-bold text-2xl flex items-center justify-center shadow-lg border border-white/10 shrink-0">
                    {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white leading-tight">
                      {resume.name || "Candidate Dossier"}
                    </h1>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                      <GraduationCap className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="truncate">{resume.college || "Academic Graduate"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                    {resume.score ? `${resume.score} Match` : "Verified"}
                  </div>
                </div>
              </div>

              {/* CANDIDATE EMAIL FIELD */}
              <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-3.5 space-y-2">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Registered Candidate Email Address
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                  <input
                    type="email"
                    placeholder="candidate@example.com"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* TECHNICAL ASSESSMENT STATUS & EXAM SCORE CARD */}
              <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-semibold uppercase text-zinc-300">Technical Assessment Status</span>
                  </div>
                  
                  {/* Exam Status Badge */}
                  {resume.examStatus === "completed" ? (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>COMPLETED</span>
                    </span>
                  ) : resume.examStatus === "in_progress" ? (
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full font-mono text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>IN PROGRESS</span>
                    </span>
                  ) : resume.examStatus === "invited" ? (
                    <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full font-mono text-[10px] font-bold flex items-center gap-1">
                      <Mail className="w-3 h-3 text-violet-400" />
                      <span>EXAM INVITED</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full font-mono text-[10px] font-bold">
                      NOT INVITED YET
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#272930]">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Exam Score:</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {resume.examScore !== null && resume.examScore !== undefined ? (
                        `${resume.examScore}%`
                      ) : (
                        <span className="text-zinc-500 text-xs font-normal">Pending Evaluation</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Hiring Pipeline Stage:</span>
                    <div className="text-xs font-semibold text-violet-300 capitalize">
                      {resume.hiringStatus ? resume.hiringStatus.replace(/_/g, " ") : (resume.isShortlisted ? "Shortlisted" : "Indexed")}
                    </div>
                  </div>
                </div>

                {/* AI Evaluation Notes if available */}
                {examData?.aiFeedback && (
                  <div className="bg-[#16171B] border border-[#272930] rounded-xl p-3 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold block">
                      AI Evaluation Summary:
                    </span>
                    <p className="leading-relaxed text-zinc-300 italic">
                      "{examData.aiFeedback}"
                    </p>
                  </div>
                )}
              </div>

              {/* DIRECT HR JITSI INTERVIEW PORTAL */}
              <div className="bg-[#0F1012] border border-cyan-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-semibold uppercase text-cyan-300">Live Video Interview Room</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400/70 border border-cyan-500/20 px-2 py-0.5 rounded-full">Jitsi Meet</span>
                </div>
                
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Directly join candidate <strong>{resume.name || "Candidate"}</strong>'s live video interview room without waiting for email dispatches.
                </p>

                <a
                  href={`https://meet.jit.si/TalentAI-Interview-${resume._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg border border-cyan-400/30 mt-2"
                >
                  <Video className="w-4 h-4 text-white" />
                  <span>Join HR Jitsi Video Interview Room</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>

              {/* 5 STAGE RECRUITER MAIL BUTTONS */}
              <div className="space-y-3 pt-2 border-t border-[#272930]">
                <div className="flex items-center justify-between text-xs font-mono uppercase text-violet-400 font-semibold">
                  <span>// Candidate Stage Email Actions</span>
                  <span className="text-zinc-500 text-[10px]">Individual Stage Mail</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  
                  {/* Button 1: Shortlist Notice */}
                  <button
                    onClick={() => handleOpenStageModal("shortlist")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>1. Shortlist Notice Email</span>
                    </div>
                    <div className="flex items-center gap-1 text-indigo-400">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Button 2: Custom & AI Exam Configurator */}
                  <button
                    onClick={() => handleOpenStageModal("exam_config")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-violet-400" />
                      <span>2. Custom AI Exam Configurator</span>
                    </div>
                    <div className="flex items-center gap-1 text-violet-400">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Button 3: Pass Round 1 & Schedule Interview */}
                  <button
                    onClick={() => handleOpenStageModal("round1_passed")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>3. Pass Round 1 & Jitsi Schedule</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Button 4: Direct Video Interview Link */}
                  <button
                    onClick={() => handleOpenStageModal("interview")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span>4. Direct Video Interview Link Email</span>
                    </div>
                    <div className="flex items-center gap-1 text-cyan-400">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Button 5: Final Offer Letter */}
                  <button
                    onClick={() => handleOpenStageModal("offer")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>5. Send Official Offer Letter Email</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </button>

                </div>
              </div>

              {/* EDITORIAL AI INSIGHT */}
              {resume.reason && (
                <div className="bg-violet-950/20 border border-violet-800/40 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-violet-400 font-mono text-[10px] uppercase">
                    <Sparkles className="w-4 h-4" />
                    <span>Editorial AI Insight</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans">
                    {resume.reason}
                  </p>
                </div>
              )}

              {/* SKILLS TAGS */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-violet-400" />
                  <span>Extracted Skills ({resume.skills?.length || 0})</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills && resume.skills.length > 0 ? (
                    resume.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full bg-[#0F1012] border border-[#272930] text-zinc-300 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 text-xs">No skills tag extracted.</span>
                  )}
                </div>
              </div>
            </div>

          </motion.div>

          {/* RIGHT COLUMN: PDF VIEWER / PARSED TEXT FALLBACK */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-[#16171B] border border-[#272930] rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col justify-between min-h-[650px]"
          >
            
            {/* VIEW CONTROLS & TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#272930] pb-4 mb-4 text-xs text-zinc-400">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <span className="font-serif italic font-normal text-white text-base truncate max-w-[200px]">
                  {pdfError ? "Parsed Resume Text & Summary" : "Resume Document Preview"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Page Navigation Controls (for Multi-Page Resumes) */}
                {viewMode === "canvas" && numPages && numPages > 1 && (
                  <div className="flex items-center gap-1 bg-[#0F1012] px-2 py-1 rounded-full border border-[#272930] text-[11px] text-zinc-300">
                    <button
                      disabled={pageNumber <= 1}
                      onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                      className="p-1 rounded hover:bg-[#272930] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[10px] px-1">
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      disabled={pageNumber >= numPages}
                      onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages))}
                      className="p-1 rounded hover:bg-[#272930] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                {viewMode === "canvas" && pdfUrl && !pdfError && (
                  <div className="flex items-center gap-1 bg-[#0F1012] px-2 py-1 rounded-full border border-[#272930] text-[11px] text-zinc-300">
                    <button
                      onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))}
                      className="p-1 rounded hover:bg-[#272930] cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[10px] w-10 text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={() => setScale((s) => Math.min(s + 0.15, 2.0))}
                      className="p-1 rounded hover:bg-[#272930] cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setScale(1.0)}
                      className="p-1 rounded hover:bg-[#272930] text-zinc-400 hover:text-white cursor-pointer ml-0.5"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* View Mode Switcher */}
                <div className="flex items-center bg-[#0F1012] p-1 rounded-full border border-[#272930] text-[11px]">
                  <button
                    onClick={() => setViewMode("canvas")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${viewMode === "canvas" ? "bg-violet-600 text-white font-semibold shadow-md" : "text-zinc-400 hover:text-white"}`}
                  >
                    Canvas View
                  </button>
                  <button
                    onClick={() => setViewMode("native")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${viewMode === "native" ? "bg-violet-600 text-white font-semibold shadow-md" : "text-zinc-400 hover:text-white"}`}
                  >
                    Embedded
                  </button>
                  <button
                    onClick={() => setViewMode("text")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${viewMode === "text" ? "bg-violet-600 text-white font-semibold shadow-md" : "text-zinc-400 hover:text-white"}`}
                  >
                    Parsed Text
                  </button>
                </div>
              </div>
            </div>

            {/* DOCUMENT / FALLBACK TEXT DISPLAY */}
            <div className="flex-1 flex justify-center items-start bg-[#0F1012] rounded-2xl border border-[#272930] p-4 sm:p-6 overflow-y-auto overflow-x-auto min-h-[600px] max-h-[800px] w-full">
              {viewMode === "text" || pdfError ? (
                /* PARSED RESUME TEXT FALLBACK VIEWER (handles 404 missing PDFs gracefully) */
                <div className="w-full space-y-6 text-left font-sans text-xs text-zinc-300">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Parsed Candidate Resume Content</div>
                      <div className="text-[11px] text-amber-200 mt-0.5">
                        {pdfError
                          ? "Original PDF file binary is missing from backend disk storage (404). Viewing parsed candidate text below."
                          : "Displaying extracted raw resume text & AI synopsis."}
                      </div>
                    </div>
                  </div>

                  {/* AI SUMMARY BOX */}
                  {resume.summary && (
                    <div className="bg-[#16171B] border border-[#272930] rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-violet-400 font-mono text-[10px] uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gemini Professional Summary</span>
                      </div>
                      <p className="font-serif italic text-base text-white leading-relaxed">
                        "{resume.summary}"
                      </p>
                    </div>
                  )}

                  {/* RAW RESUME TEXT */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      Extracted Full Resume Text Snippet:
                    </div>
                    <div className="bg-[#16171B] border border-[#272930] rounded-2xl p-4 font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {resume.resumeText || "No plain text extracted from resume document."}
                    </div>
                  </div>
                </div>
              ) : pdfUrl ? (
                viewMode === "canvas" ? (
                  <div className="py-2 flex justify-center w-full">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="text-xs text-zinc-400 py-16 flex flex-col items-center gap-3">
                          <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                          Rendering Resume Document...
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-2xl rounded-lg overflow-hidden border border-[#272930]"
                      />
                    </Document>
                  </div>
                ) : (
                  <iframe
                    src={pdfUrl}
                    title="Resume PDF Embedded Preview"
                    className="w-full h-[700px] rounded-xl border border-[#272930]"
                  />
                )
              ) : (
                <div className="text-center p-8 text-zinc-500 text-xs flex flex-col items-center gap-2 font-sans">
                  <FileText className="w-8 h-8 opacity-40" />
                  PDF file path missing. Switching to parsed text view above.
                </div>
              )}
            </div>

          </motion.div>

        </div>

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
                  <p className="text-xs text-zinc-400">Sending to {resume.name}</p>
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
                <span>{actionLoading ? "Sending..." : "Send Shortlist Email"}</span>
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

            {/* Parameters */}
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

            {/* Questions Editor List */}
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

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Question Prompt</label>
                    <textarea
                      rows={2}
                      value={q.questionText}
                      onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                      className="w-full bg-[#16171B] border border-[#272930] rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

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

            <div className="flex items-center justify-between pt-2 border-t border-[#272930]">
              <div className="text-xs text-zinc-400">
                Sending custom exam link to <strong>{resume.name}</strong>
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
                  <span>{actionLoading ? "Sending Invites..." : "Send Configured Exam"}</span>
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

            <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-4 text-xs font-sans space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Candidate Assessment Result:</div>
              <div className="flex items-center justify-between text-zinc-200">
                <span className="font-bold">{resume.name} ({candidateEmail})</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {resume.examScore !== null && resume.examScore !== undefined ? `${resume.examScore}% Score` : "Score Pending"}
                </span>
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
                <span>{actionLoading ? "Sending..." : "Send Round 1 Passed Email"}</span>
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
                  <p className="text-xs text-zinc-400">Sending to {resume.name}</p>
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
                <span>{actionLoading ? "Sending..." : "Send Video Join Link"}</span>
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
                  <p className="text-xs text-zinc-400">Sending to {resume.name}</p>
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

            <div className="flex items-center justify-end gap-3 pt-2">
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
                <span>{actionLoading ? "Sending..." : "Send Offer Letter Email"}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDeleteResume}
        title="Delete Candidate Dossier?"
        description="Are you sure you want to permanently delete this candidate resume? This action will remove the record from your database and cannot be undone."
        confirmText="Delete Permanently"
        loading={deletingResume}
        variant="danger"
      />

    </div>
  )
}

export default CandidateDetails
