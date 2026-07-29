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
  X
} from "lucide-react"

import InterviewModal from "../components/InterviewModal"
import { getBackendUrl } from "../utils/api"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

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
  const [viewMode, setViewMode] = useState("canvas")

  // Recruitment Action States
  const [candidateEmail, setCandidateEmail] = useState(initialResume?.email || "")
  const [sendingInvite, setSendingInvite] = useState(false)
  const [sendingInterviewInvite, setSendingInterviewInvite] = useState(false)
  const [togglingShortlist, setTogglingShortlist] = useState(false)
  const [deletingResume, setDeletingResume] = useState(false)
  const [examData, setExamData] = useState(null)
  const [isInterviewOpen, setIsInterviewOpen] = useState(false)

  // Interview Schedule Modal States
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")

  // Save active candidate ID to localStorage for seamless refresh persistence
  useEffect(() => {
    if (resume?._id) {
      localStorage.setItem("talent_ai_active_candidate_id", resume._id)
    }
  }, [resume?._id])

  // Fetch candidate details by ID on refresh if state was lost
  useEffect(() => {
    if (!resume && candidateId) {
      fetchCandidateById(candidateId)
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

  const handleDeleteResume = async () => {
    if (!confirm("Are you sure you want to delete this CV/Resume? After removing, it will never appear in your search results again.")) {
      return
    }

    setDeletingResume(true)
    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      await axios.delete(`${backendUrl}/resumes/${resume._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      localStorage.removeItem("talent_ai_active_candidate_id")
      alert("Resume removed from database and search results successfully.")
      navigate("/")
    } catch (err) {
      alert("Error deleting resume: " + (err.response?.data?.message || err.message))
    } finally {
      setDeletingResume(false)
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
  const cleanFilePath = resume.filePath
    ? resume.filePath.replace(/\\/g, "/").replace(/^\//, "")
    : null
  const pdfUrl = cleanFilePath ? `${backendBase}/${cleanFilePath}` : null

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPdfError(false)
  }

  const onDocumentLoadError = (err) => {
    console.error("PDF Load Error:", err)
    setPdfError(true)
  }

  const handleToggleShortlist = async () => {
    setTogglingShortlist(true)
    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.post(
        `${backendUrl}/api/exams/shortlist/${resume._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setResume((prev) => ({ ...prev, isShortlisted: res.data.isShortlisted }))
      alert(res.data.message)
    } catch (err) {
      alert("Error toggling shortlist: " + (err.response?.data?.message || err.message))
    } finally {
      setTogglingShortlist(false)
    }
  }

  const handleSendExamInvite = async () => {
    if (!candidateEmail || !candidateEmail.includes("@")) {
      alert("Please enter a valid candidate email address to send the exam invitation.")
      return
    }

    setSendingInvite(true)
    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.post(
        `${backendUrl}/api/exams/invite/${resume._id}`,
        { candidateEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert(res.data.message)
      setResume((prev) => ({ ...prev, isShortlisted: true, examStatus: "invited", email: candidateEmail }))
      fetchExamData()
    } catch (err) {
      alert("Error sending exam invite: " + (err.response?.data?.message || err.message))
    } finally {
      setSendingInvite(false)
    }
  }

  const handleSendScheduledInterview = async () => {
    if (!candidateEmail || !candidateEmail.includes("@")) {
      alert("Please enter a valid candidate email address.")
      return
    }

    setSendingInterviewInvite(true)
    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.post(
        `${backendUrl}/api/exams/interview-invite/${resume._id}`,
        {
          candidateEmail,
          scheduledDate: scheduledDate || "As Scheduled",
          scheduledTime: scheduledTime || "TBD by HR"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert(res.data.message)
      setScheduleModalOpen(false)
      setResume((prev) => ({ ...prev, email: candidateEmail, hiringStatus: "interview_scheduled" }))
      fetchExamData()
    } catch (err) {
      alert("Error sending video interview invite: " + (err.response?.data?.message || err.message))
    } finally {
      setSendingInterviewInvite(false)
    }
  }

  const handleSendConfirmation = async () => {
    if (!candidateEmail || !candidateEmail.includes("@")) {
      alert("Please enter a valid candidate email address.")
      return
    }

    try {
      const backendUrl = getBackendUrl()
      const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")
      const res = await axios.post(
        `${backendUrl}/api/exams/confirm-hiring/${resume._id}`,
        { email: candidateEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert(res.data.message)
      setResume((prev) => ({ ...prev, hiringStatus: "hired" }))
    } catch (err) {
      alert("Error sending confirmation email: " + (err.response?.data?.message || err.message))
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0F1012] text-[#F9F8F6] p-4 sm:p-6 lg:p-10 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP BAR */}
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

          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteResume}
              disabled={deletingResume}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deletingResume ? "Deleting..." : "Delete Candidate CV"}</span>
            </button>

            {pdfUrl && (
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

        {/* MAIN SPLIT VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: DOSSIER INFO */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 space-y-6"
          >

            {/* CANDIDATE HEADER CARD */}
            <div className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-serif font-bold text-2xl flex items-center justify-center shadow-lg shrink-0">
                    {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl font-normal text-white">
                      {resume.name || "Candidate Dossier"}
                    </h1>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                      <GraduationCap className="w-4 h-4 text-violet-400 shrink-0" />
                      <span>{resume.college || "Institution Unspecified"}</span>
                    </div>
                  </div>
                </div>

                {resume.score && (
                  <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-sm font-bold text-center shrink-0">
                    <div className="text-[9px] uppercase font-mono text-emerald-400">Match</div>
                    {resume.score}
                  </div>
                )}
              </div>

              {/* RECRUITMENT ACTION PIPELINE */}
              <div className="bg-[#0F1012] border border-[#272930] rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-violet-400" />
                  <span>Editorial Recruitment Pipeline</span>
                </h3>

                {/* EMAIL INPUT & SHORTLIST BUTTON */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Candidate Email (Auto-extracted):</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="flex-1 bg-[#16171B] border border-[#272930] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={handleToggleShortlist}
                      disabled={togglingShortlist}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border shrink-0 ${
                        resume.isShortlisted
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-[#16171B] text-zinc-300 border-[#272930] hover:bg-zinc-800"
                      }`}
                    >
                      {resume.isShortlisted ? "✓ Shortlisted" : "+ Shortlist"}
                    </button>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <button
                    onClick={handleSendExamInvite}
                    disabled={sendingInvite}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
                  >
                    <Mail className="w-4 h-4" />
                    {sendingInvite ? "Sending Assessment Email..." : "Send 24h Technical Assessment Invite"}
                  </button>

                  <button
                    onClick={() => setScheduleModalOpen(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
                  >
                    <Video className="w-4 h-4 text-emerald-100" />
                    <span>Email Passed Exam & Schedule Jitsi Interview</span>
                  </button>

                  <button
                    onClick={() => setIsInterviewOpen(true)}
                    className="w-full py-2.5 bg-[#16171B] hover:bg-zinc-800 text-violet-300 border border-violet-500/30 font-semibold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <UserCheck className="w-4 h-4 text-violet-400" />
                    <span>Open Live HR Evaluation Console</span>
                  </button>

                  <button
                    onClick={handleSendConfirmation}
                    className="w-full py-2.5 bg-[#FAF8F5] !text-[#0F1012] font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-md hover:bg-white transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Offer Confirmation Letter</span>
                  </button>
                </div>

                {/* EXAM STATUS */}
                {examData && (
                  <div className="bg-[#16171B] border border-[#272930] rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Exam Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        examData.status === "completed" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {examData.status}
                      </span>
                    </div>
                    {examData.status === "completed" && (
                      <div className="flex items-center justify-between text-violet-300 font-bold font-mono">
                        <span>AI Auto-Score:</span>
                        <span className="text-sm">{examData.score}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACADEMICS & METRICS */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0F1012] border border-[#272930]">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Academic CGPA</span>
                  <div className="text-base font-serif font-bold text-violet-300">
                    {resume.cgpa ? `${resume.cgpa} / 10` : "N/A"}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Pipeline Status</span>
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1 capitalize">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resume.hiringStatus || "Shortlisted"}
                  </div>
                </div>
              </div>

              {/* AI INSIGHT */}
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

              {/* SKILLS */}
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

          {/* RIGHT COLUMN: PDF VIEWER */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-[#16171B] border border-[#272930] rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col justify-between min-h-[650px]"
          >
            
            {/* PDF CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#272930] pb-4 mb-4 text-xs text-zinc-400">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <span className="font-serif italic font-normal text-white text-base truncate max-w-[200px]">
                  Resume Document Preview
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#0F1012] p-1 rounded-full border border-[#272930] text-[11px]">
                  <button
                    onClick={() => setViewMode("canvas")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${viewMode === "canvas" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
                  >
                    Canvas View
                  </button>
                  <button
                    onClick={() => setViewMode("native")}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${viewMode === "native" ? "bg-violet-600 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
                  >
                    Embedded
                  </button>
                </div>

                {viewMode === "canvas" && numPages && (
                  <div className="flex items-center gap-1 bg-[#0F1012] px-3 py-1 rounded-full border border-[#272930]">
                    <button
                      onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                      disabled={pageNumber <= 1}
                      className="hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-zinc-300 font-mono px-1">
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
                      disabled={pageNumber >= numPages}
                      className="hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PDF DISPLAY */}
            <div className="flex-1 flex justify-center items-center bg-[#0F1012] rounded-2xl border border-[#272930] p-2 overflow-auto min-h-[550px] max-h-[750px]">
              {pdfUrl ? (
                pdfError ? (
                  <div className="text-center p-8 max-w-md bg-[#16171B] border border-[#272930] rounded-2xl space-y-4 shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg text-white mb-1">Resume File Missing (404)</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-2 font-sans">
                        The file <code className="text-violet-300 font-mono text-[11px] bg-[#0F1012] px-1.5 py-0.5 rounded border border-[#272930]">{cleanFilePath}</code> was not found on backend storage.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-full transition-all cursor-pointer shadow-md"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Candidate Matcher
                    </button>
                  </div>
                ) : viewMode === "canvas" ? (
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="text-xs text-zinc-400 py-12 flex flex-col items-center gap-3">
                        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                        Rendering Resume Document...
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-2xl rounded"
                    />
                  </Document>
                ) : (
                  <iframe
                    src={pdfUrl}
                    title="Resume PDF Embedded Preview"
                    className="w-full h-[650px] rounded-xl border border-[#272930]"
                  />
                )
              ) : (
                <div className="text-center p-8 text-zinc-500 text-xs flex flex-col items-center gap-2 font-sans">
                  <FileText className="w-8 h-8 opacity-40" />
                  PDF file path missing or unavailable.
                </div>
              )}
            </div>
          </motion.div>

        </div>

      </div>

      {/* SCHEDULE INTERVIEW MODAL */}
      <AnimatePresence>
        {scheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#272930] pb-4">
                <div className="flex items-center space-x-2">
                  <Video className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-serif text-xl text-white">Schedule Live Jitsi Interview</h3>
                </div>
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <p className="font-bold text-sm">Exam Passed Email Notification</p>
                  <p className="text-[11px] text-zinc-400">
                    Candidate <strong>{resume.name}</strong> will receive an email stating they passed the technical exam with their scheduled meeting date/time and direct Jitsi video room link.
                  </p>
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono text-[10px] uppercase mb-1">
                    Candidate Email
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-mono text-[10px] uppercase mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-violet-400" />
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-mono text-[10px] uppercase mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-violet-400" />
                      Select Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-[#0F1012] border border-[#272930] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendScheduledInterview}
                  disabled={sendingInterviewInvite}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition shadow-xl mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingInterviewInvite ? "Sending Email..." : "Send Assessment Passed & Jitsi Meeting Email"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InterviewModal
        isOpen={isInterviewOpen}
        onClose={() => setIsInterviewOpen(false)}
        candidate={resume}
        exam={examData}
        onUpdate={fetchExamData}
      />
    </div>
  )
}

export default CandidateDetails
