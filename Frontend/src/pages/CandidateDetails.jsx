import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Document, Page, pdfjs } from "react-pdf"
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url"
import axios from "axios"
import {
    ArrowLeft,
    GraduationCap,
    Award,
    Sparkles,
    ExternalLink,
    FileText,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    CheckCircle2,
    Mail,
    Send,
    Video,
    UserCheck,
    Clock,
    Check,
    X,
    FileCheck
} from "lucide-react"

import InterviewModal from "../components/InterviewModal"

import { getBackendUrl } from "../utils/api"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const CandidateDetails = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const initialResume = location.state

    const [resume, setResume] = useState(initialResume)
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [pdfError, setPdfError] = useState(false)

    // Recruitment Action States
    const [candidateEmail, setCandidateEmail] = useState(initialResume?.email || "")
    const [sendingInvite, setSendingInvite] = useState(false)
    const [togglingShortlist, setTogglingShortlist] = useState(false)
    const [examData, setExamData] = useState(null)
    const [isInterviewOpen, setIsInterviewOpen] = useState(false)

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

            if (res.data.success) {
                setExamData(res.data.exam)
            }
        } catch (err) {
            // Exam record not generated yet
        }
    }

    if (!resume) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Candidate Selected</h2>
                <p className="text-slate-400 text-sm max-w-md mb-6">
                    Please search and select a candidate from the Resume Matcher to view details.
                </p>
                <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Resume Matcher
                </button>
            </div>
        )
    }

    const backendBase = getBackendUrl()
    const pdfUrl = resume.filePath
        ? `${backendBase}/${resume.filePath.replace(/^\//, "")}`
        : null

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
            setResume((prev) => ({ ...prev, isShortlisted: true, examStatus: "invited" }))
            fetchExamData()
        } catch (err) {
            alert("Error sending exam invite: " + (err.response?.data?.message || err.message))
        } finally {
            setSendingInvite(false)
        }
    }

    const handleSendConfirmation = async () => {
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
        <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* TOP NAV BAR */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <button
                        onClick={() => navigate("/")}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 text-indigo-400" />
                        Back to Candidates List
                    </button>

                    <div className="flex items-center gap-2">
                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open Raw File
                            </a>
                        )}
                    </div>
                </div>

                {/* MAIN SPLIT VIEW */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: CANDIDATE INFO & RECRUITMENT PIPELINE (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* CANDIDATE HEADER CARD */}
                        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shrink-0">
                                        {resume.name ? resume.name.charAt(0).toUpperCase() : "C"}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">
                                            {resume.name || "Candidate Name"}
                                        </h1>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                            <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
                                            <span>{resume.college || "Institution Unspecified"}</span>
                                        </div>
                                    </div>
                                </div>

                                {resume.score && (
                                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm shadow-inner shrink-0 text-center">
                                        <div className="text-[10px] uppercase font-bold text-emerald-500">Match</div>
                                        {resume.score}
                                    </div>
                                )}
                            </div>

                            {/* RECRUITMENT ACTION PIPELINE */}
                            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-indigo-400" />
                                    Recruitment Pipeline Actions
                                </h3>

                                {/* EMAIL INPUT & SHORTLIST BUTTON */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400 block">Candidate Email Address:</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={candidateEmail}
                                            onChange={(e) => setCandidateEmail(e.target.value)}
                                            placeholder="candidate@example.com"
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleToggleShortlist}
                                            disabled={togglingShortlist}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${resume.isShortlisted ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"}`}
                                        >
                                            {resume.isShortlisted ? "✓ Shortlisted" : "+ Shortlist"}
                                        </button>
                                    </div>
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="grid grid-cols-1 gap-2.5 pt-1">
                                    {/* 1. SEND EXAM INVITE */}
                                    <button
                                        onClick={handleSendExamInvite}
                                        disabled={sendingInvite}
                                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                                    >
                                        <Mail className="w-4 h-4" />
                                        {sendingInvite ? "Generating AI Exam..." : "Send 24h Exam Invite Email"}
                                    </button>

                                    {/* 2. LAUNCH INTERVIEW modal */}
                                    <button
                                        onClick={() => setIsInterviewOpen(true)}
                                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Video className="w-4 h-4 text-indigo-400" />
                                        Launch Video & Mic Interview Round
                                    </button>

                                    {/* 3. SEND CONFIRMATION EMAIL */}
                                    <button
                                        onClick={handleSendConfirmation}
                                        className="w-full py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send Final Offer & Confirmation Email
                                    </button>
                                </div>

                                {/* EXAM STATUS BADGE */}
                                {examData && (
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-semibold">Exam Status:</span>
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${examData.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                                                {examData.status}
                                            </span>
                                        </div>
                                        {examData.status === "completed" && (
                                            <div className="flex items-center justify-between text-indigo-300 font-bold">
                                                <span>AI Auto-Score:</span>
                                                <span className="text-sm">{examData.score}%</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ACADEMICS & METRICS */}
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                                        Academic CGPA
                                    </span>
                                    <div className="text-lg font-extrabold text-indigo-300">
                                        {resume.cgpa ? `${resume.cgpa} / 10` : "N/A"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                                        Hiring Status
                                    </span>
                                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1 capitalize">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {resume.hiringStatus || "Shortlisted"}
                                    </div>
                                </div>
                            </div>

                            {/* AI SUITABILITY MATCH REASONING */}
                            {resume.reason && (
                                <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-4 space-y-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                                        <Sparkles className="w-4 h-4" />
                                        AI Evaluation Insight
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        {resume.reason}
                                    </p>
                                </div>
                            )}

                            {/* SKILLS BREAKDOWN */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-indigo-400" />
                                    Identified Skills ({resume.skills?.length || 0})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {resume.skills && resume.skills.length > 0 ? (
                                        resume.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-slate-200 text-xs font-semibold shadow-sm"
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-500 text-xs">No skills tag extracted.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: PDF VIEWER (7 cols) */}
                    <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col justify-between min-h-[650px]">
                        
                        {/* PDF HEADER CONTROLS */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4 text-xs font-medium text-slate-400">
                            <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                                    Resume Document Preview
                                </span>
                            </div>

                            {/* CONTROLS */}
                            <div className="flex items-center gap-2">
                                {numPages && (
                                    <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                        <button
                                            onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                                            disabled={pageNumber <= 1}
                                            className="hover:text-white disabled:opacity-30 cursor-pointer"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-[11px] text-slate-300 font-semibold px-1">
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

                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                    <button
                                        onClick={() => setScale((s) => Math.max(s - 0.2, 0.6))}
                                        className="p-1 hover:text-white cursor-pointer"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[11px] text-slate-400 font-semibold">
                                        {Math.round(scale * 100)}%
                                    </span>
                                    <button
                                        onClick={() => setScale((s) => Math.min(s + 0.2, 2.0))}
                                        className="p-1 hover:text-white cursor-pointer"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PDF CANVAS CONTAINER */}
                        <div className="flex-1 flex justify-center items-center bg-slate-950/60 rounded-xl border border-slate-800/80 p-2 overflow-auto max-h-[700px]">
                            {pdfUrl ? (
                                <Document
                                    file={pdfUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={onDocumentLoadError}
                                    loading={
                                        <div className="text-xs text-slate-400 py-12 flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
                                <div className="text-center p-8 text-slate-500 text-xs">
                                    PDF file path missing or unavailable.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>

            {/* INTERVIEW WEBRTC MODAL */}
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
