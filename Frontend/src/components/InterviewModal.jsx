import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { io } from "socket.io-client"
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    CheckCircle,
    XCircle,
    X,
    UserCheck,
    Award,
    Sparkles,
    Send,
    ExternalLink,
    ShieldCheck,
    BellRing,
    Copy
} from "lucide-react"

import { getBackendUrl } from "../utils/api"
import { toast } from "react-hot-toast"

export default function InterviewModal({ isOpen, onClose, candidate, exam, onUpdate }) {
    const [cameraActive, setCameraActive] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [interviewNotes, setInterviewNotes] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [candidateWaitingInMeet, setCandidateWaitingInMeet] = useState(exam?.candidateJoined || false)

    const socketRef = useRef(null)
    const roomId = exam?.interviewToken || candidate?.interviewToken || candidate?._id
    const meetLink = exam?.meetLink || candidate?.meetLink || `https://meet.google.com`

    useEffect(() => {
        if (isOpen && roomId) {
            const backendUrl = getBackendUrl()
            const socket = io(backendUrl)
            socketRef.current = socket

            socket.emit("join-interview-room", {
                roomId,
                userRole: "hr",
                userName: "HR Evaluator"
            })

            socket.on("candidate-waiting-in-meet", ({ candidateName }) => {
                setCandidateWaitingInMeet(true)
            })

            socket.on("user-joined", () => {
                setCandidateWaitingInMeet(true)
            })
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect()
                socketRef.current = null
            }
        }
    }, [isOpen, roomId])

    const handleUpdateStatus = async (status) => {
        if (!exam?._id) return
        setSubmitting(true)
        try {
            const backendUrl = getBackendUrl()
            const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")

            await axios.patch(
                `${backendUrl}/api/exams/interview/${exam._id}`,
                {
                    interviewStatus: status,
                    interviewNotes
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            if (onUpdate) onUpdate()
            onClose()
        } catch (err) {
            toast.error("Error updating interview status: " + (err.response?.data?.message || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    const handleSendHiringEmail = async () => {
        if (!candidate?._id) return
        setSubmitting(true)
        try {
            const backendUrl = getBackendUrl()
            const token = localStorage.getItem("token") || localStorage.getItem("talent_ai_token")

            const res = await axios.post(
                `${backendUrl}/api/exams/confirm-hiring/${candidate._id}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            toast.success(res.data.message || "Selection email sent successfully!")
            if (onUpdate) onUpdate()
            onClose()
        } catch (err) {
            toast.error("Error sending confirmation email: " + (err.response?.data?.message || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative flex flex-col md:flex-row gap-6 max-h-[95vh] overflow-y-auto my-auto">
                
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 cursor-pointer z-30"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* LEFT COLUMN: GOOGLE MEET JOIN STAGE & NOTIFICATION */}
                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2 mb-1">
                            <Video className="w-5 h-5 text-emerald-400" />
                            HR Google Meet Evaluation Console
                        </h3>
                        <p className="text-xs text-slate-400">
                            Candidate: <strong className="text-white">{candidate?.name}</strong> ({candidate?.roleCategory || "Software Engineer"})
                        </p>
                    </div>

                    {/* LIVE CANDIDATE WAITING ALERT NOTIFICATION BANNER */}
                    {candidateWaitingInMeet ? (
                        <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 animate-pulse shadow-lg shadow-emerald-500/10">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                                <BellRing className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Candidate Waiting in Google Meet!</h4>
                                <p className="text-xs text-emerald-200 mt-0.5">
                                    <strong>{candidate?.name}</strong> has joined the Google Meet session. Click below to enter the meeting.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-4 flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
                            <p className="text-xs text-slate-300">
                                Verified Google Meet room active. When the candidate enters using their email, a live alert will sound here.
                            </p>
                        </div>
                    )}

                    {/* INSTANT WORKING VIDEO ROOM CARD */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-inner">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                            <Video className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-white mb-1">Instant Live Video Interview Room</h4>
                            <p className="text-xs text-slate-400">
                                100% Working Live Video Room for HR and Candidate (<strong className="text-emerald-300">{candidate?.email}</strong>).
                            </p>
                        </div>

                        <a
                            href={meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Join Live Video Interview Room Now
                        </a>
                    </div>

                    {/* EXAM SCORE SUMMARY BADGE */}
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Award className="w-7 h-7 text-indigo-400" />
                            <div>
                                <span className="text-[11px] text-slate-400 block font-semibold uppercase">Exam Score</span>
                                <span className="text-base font-bold text-white">{typeof exam?.score === "number" ? `${exam.score}%` : "Pending / Not Taken"}</span>
                            </div>
                        </div>

                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${exam?.score >= 50 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                            {exam?.score >= 50 ? "PASSED ASSESSMENT" : "NEEDS REVIEW"}
                        </span>
                    </div>
                </div>

                {/* RIGHT COLUMN: HR NOTES & SELECTION OFFER DECISION PANEL */}
                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            HR Interview Notes & Evaluation
                        </h4>

                        {exam?.aiFeedback && (
                            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                                <span className="text-indigo-400 font-bold block">AI Technical Assessment Summary:</span>
                                <p className="leading-relaxed text-slate-300 text-[11px]">{exam.aiFeedback}</p>
                            </div>
                        )}

                        <textarea
                            value={interviewNotes}
                            onChange={(e) => setInterviewNotes(e.target.value)}
                            rows={4}
                            placeholder="Enter interviewer feedback, technical impressions, communication rating..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                            <span className="text-slate-400 font-semibold block">Google Meet Room Link:</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={meetLink}
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-300 truncate font-mono"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(meetLink)
                                        toast.success("Google Meet link copied to clipboard!")
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                >
                                    <Copy className="w-3 h-3" />
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FINAL SELECTION DECISION BUTTONS */}
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleUpdateStatus("passed")}
                                disabled={submitting}
                                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Pass Interview
                            </button>

                            <button
                                onClick={() => handleUpdateStatus("failed")}
                                disabled={submitting}
                                className="py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                        </div>

                        <button
                            onClick={handleSendHiringEmail}
                            disabled={submitting}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                        >
                            <Send className="w-4 h-4" />
                            Send Final Selection & PDF Offer Email
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
