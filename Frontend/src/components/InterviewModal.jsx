import { useState, useEffect, useRef } from "react"
import axios from "axios"
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    CheckCircle,
    XCircle,
    X,
    UserCheck,
    Award,
    Sparkles,
    Send
} from "lucide-react"

export default function InterviewModal({ isOpen, onClose, candidate, exam, onUpdate }) {
    const [cameraActive, setCameraActive] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [stream, setStream] = useState(null)
    const [interviewNotes, setInterviewNotes] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const videoRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            startMedia()
        } else {
            stopMedia()
        }
        return () => stopMedia()
    }, [isOpen])

    const startMedia = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            setStream(mediaStream)
            setCameraActive(true)
            setMicActive(true)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err) {
            console.warn("Camera/Mic access denied or unavailable:", err)
        }
    }

    const stopMedia = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
        }
        setCameraActive(false)
        setMicActive(false)
    }

    const toggleCamera = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setCameraActive(videoTrack.enabled)
            }
        }
    }

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setMicActive(audioTrack.enabled)
            }
        }
    }

    const handleUpdateStatus = async (status) => {
        if (!exam?._id) return
        setSubmitting(true)
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
            const token = localStorage.getItem("token")

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
            alert("Error updating interview status: " + (err.response?.data?.message || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    const handleSendHiringEmail = async () => {
        if (!candidate?._id) return
        setSubmitting(true)
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
            const token = localStorage.getItem("token")

            const res = await axios.post(
                `${backendUrl}/api/exams/confirm-hiring/${candidate._id}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            alert(res.data.message || "Selection email sent successfully!")
            if (onUpdate) onUpdate()
            onClose()
        } catch (err) {
            alert("Error sending confirmation email: " + (err.response?.data?.message || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Column: Live Camera Video Stream */}
                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                            <Video className="w-5 h-5 text-indigo-400" />
                            Live Interview Round
                        </h3>
                        <p className="text-xs text-slate-400">
                            Candidate: <strong className="text-white">{candidate?.name}</strong> ({candidate?.roleCategory})
                        </p>
                    </div>

                    {/* Camera Feed Container */}
                    <div className="relative aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                        />

                        {!cameraActive && (
                            <div className="text-center p-4">
                                <VideoOff className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Camera stream inactive or permission blocked</p>
                            </div>
                        )}

                        {/* Stream Controls Overlay */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700">
                            <button
                                onClick={toggleCamera}
                                className={`p-2 rounded-full cursor-pointer transition-colors ${cameraActive ? "bg-indigo-600 text-white" : "bg-rose-600/80 text-white"}`}
                                title="Toggle Camera"
                            >
                                {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={toggleMic}
                                className={`p-2 rounded-full cursor-pointer transition-colors ${micActive ? "bg-indigo-600 text-white" : "bg-rose-600/80 text-white"}`}
                                title="Toggle Microphone"
                            >
                                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Candidate Score Badge */}
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Award className="w-8 h-8 text-indigo-400" />
                            <div>
                                <span className="text-xs text-slate-400 block font-semibold uppercase">Exam Score</span>
                                <span className="text-lg font-bold text-white">{exam?.score ?? "N/A"}%</span>
                            </div>
                        </div>

                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${exam?.score >= 50 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                            {exam?.score >= 50 ? "PASSED ASSESSMENT" : "NEEDS REVIEW"}
                        </span>
                    </div>
                </div>

                {/* Right Column: HR Interview Notes & Decision Panel */}
                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            HR Interview Notes & Evaluation
                        </h4>

                        {exam?.aiFeedback && (
                            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                                <span className="text-indigo-400 font-bold block">AI Assessment Summary:</span>
                                <p>{exam.aiFeedback}</p>
                            </div>
                        )}

                        <textarea
                            value={interviewNotes}
                            onChange={(e) => setInterviewNotes(e.target.value)}
                            rows={5}
                            placeholder="Enter interviewer feedback, technical impressions, communication score..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Final Decision Action Buttons */}
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
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                        >
                            <Send className="w-4 h-4" />
                            Send Final Selection & Offer Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
