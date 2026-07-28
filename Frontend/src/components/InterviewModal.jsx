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
    Maximize2,
    ShieldCheck,
    PhoneOff
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ]
}

export default function InterviewModal({ isOpen, onClose, candidate, exam, onUpdate }) {
    const [cameraActive, setCameraActive] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [remotePeerConnected, setRemotePeerConnected] = useState(false)
    const [swapView, setSwapView] = useState(false)
    const [interviewNotes, setInterviewNotes] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    const localStreamRef = useRef(null)
    const screenStreamRef = useRef(null)
    const peerConnectionRef = useRef(null)
    const socketRef = useRef(null)

    const roomId = exam?.interviewToken || candidate?.interviewToken || candidate?._id

    useEffect(() => {
        if (isOpen) {
            startSession()
        } else {
            stopSession()
        }
        return () => stopSession()
    }, [isOpen, roomId])

    const startSession = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            localStreamRef.current = mediaStream
            setCameraActive(true)
            setMicActive(true)

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = mediaStream
            }

            // Connect to Socket.io WebRTC signaling server
            if (roomId) {
                const backendUrl = getBackendUrl()
                const socket = io(backendUrl)
                socketRef.current = socket

                socket.on("connect", () => {
                    console.log("HR connected to WebRTC signaling:", socket.id)
                    socket.emit("join-interview-room", {
                        roomId,
                        userRole: "hr",
                        userName: "HR Evaluator"
                    })
                })

                socket.on("user-joined", async ({ userRole }) => {
                    console.log("Candidate joined interview room:", userRole)
                    setRemotePeerConnected(true)
                    await createWebRTCOffer()
                })

                socket.on("webrtc-offer", async ({ offer }) => {
                    console.log("Received WebRTC offer from Candidate")
                    setRemotePeerConnected(true)
                    await handleWebRTCOffer(offer)
                })

                socket.on("webrtc-answer", async ({ answer }) => {
                    console.log("Received WebRTC answer from Candidate")
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
                    }
                })

                socket.on("ice-candidate", async ({ candidate }) => {
                    if (peerConnectionRef.current && candidate) {
                        try {
                            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                        } catch (err) {
                            console.error("Error adding ICE candidate:", err)
                        }
                    }
                })

                socket.on("user-left", () => {
                    setRemotePeerConnected(false)
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null
                    }
                })
            }
        } catch (err) {
            console.warn("HR Camera/Mic access denied:", err)
        }
    }

    const getOrCreatePeerConnection = () => {
        if (peerConnectionRef.current) return peerConnectionRef.current

        const pc = new RTCPeerConnection(ICE_SERVERS)
        peerConnectionRef.current = pc

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current)
            })
        }

        pc.ontrack = (event) => {
            console.log("HR received remote candidate stream track")
            setRemotePeerConnected(true)
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0]
            }
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("ice-candidate", {
                    roomId,
                    candidate: event.candidate
                })
            }
        }

        return pc
    }

    const createWebRTCOffer = async () => {
        const pc = getOrCreatePeerConnection()
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        if (socketRef.current) {
            socketRef.current.emit("webrtc-offer", { roomId, offer })
        }
    }

    const handleWebRTCOffer = async (offer) => {
        const pc = getOrCreatePeerConnection()
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        if (socketRef.current) {
            socketRef.current.emit("webrtc-answer", { roomId, answer })
        }
    }

    const toggleCamera = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setCameraActive(videoTrack.enabled)
            }
        }
    }

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setMicActive(audioTrack.enabled)
            }
        }
    }

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                })
                const screenTrack = screenStream.getVideoTracks()[0]

                if (peerConnectionRef.current) {
                    const senders = peerConnectionRef.current.getSenders()
                    const videoSender = senders.find((s) => s.track && s.track.kind === "video")
                    if (videoSender) {
                        videoSender.replaceTrack(screenTrack)
                    }
                }

                screenTrack.onended = () => {
                    stopScreenShare()
                }

                screenStreamRef.current = screenStream
                setIsScreenSharing(true)

                if (socketRef.current) {
                    socketRef.current.emit("screen-share-status", {
                        roomId,
                        isSharing: true,
                        userRole: "hr"
                    })
                }
            } catch (err) {
                console.error("HR Screen share error:", err)
            }
        } else {
            stopScreenShare()
        }
    }

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop())
            screenStreamRef.current = null
        }
        if (localStreamRef.current && peerConnectionRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0]
            const senders = peerConnectionRef.current.getSenders()
            const videoSender = senders.find((s) => s.track && s.track.kind === "video")
            if (videoSender && camTrack) {
                videoSender.replaceTrack(camTrack)
            }
        }
        setIsScreenSharing(false)
        if (socketRef.current) {
            socketRef.current.emit("screen-share-status", {
                roomId,
                isSharing: false,
                userRole: "hr"
            })
        }
    }

    const stopSession = () => {
        stopScreenShare()
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop())
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        if (socketRef.current) {
            socketRef.current.emit("leave-interview-room", { roomId })
            socketRef.current.disconnect()
            socketRef.current = null
        }
        setRemotePeerConnected(false)
    }

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
            alert("Error updating interview status: " + (err.response?.data?.message || err.message))
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl relative flex flex-col lg:flex-row gap-6 max-h-[95vh] overflow-y-auto my-auto">
                
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 cursor-pointer z-30"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* LEFT COLUMN: BIG STAGE WEBRTC VIDEO STREAM (60% WIDTH ON LG) */}
                <div className="w-full lg:w-7/12 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2 mb-1">
                            <Video className="w-5 h-5 text-indigo-400" />
                            HR Live WebRTC Interview Room
                        </h3>
                        <p className="text-xs text-slate-400">
                            Candidate: <strong className="text-white">{candidate?.name}</strong> ({candidate?.roleCategory})
                        </p>
                    </div>

                    {/* BIGGER VIDEO STAGE WITH PiP */}
                    <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[300px] sm:min-h-[380px]">
                        
                        {/* MAIN VIDEO STREAM: CANDIDATE (OR SWAPPED HR STREAM) */}
                        <video
                            ref={swapView ? localVideoRef : remoteVideoRef}
                            autoPlay
                            playsInline
                            muted={swapView}
                            className="w-full h-full object-cover"
                        />

                        {!remotePeerConnected && !swapView && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90 backdrop-blur-sm z-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center animate-pulse">
                                    <Video className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-white">Candidate Has Not Joined Yet</h4>
                                <p className="text-xs text-slate-400 max-w-xs">
                                    When the candidate opens their 5-minute email join link, live video and screen sharing will stream here instantly.
                                </p>
                            </div>
                        )}

                        {/* STATUS BADGES */}
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-white">
                            <span className={`w-2.5 h-2.5 rounded-full ${remotePeerConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                            <span>{remotePeerConnected ? "Candidate Live" : "Waiting for Candidate"}</span>
                        </div>

                        {isScreenSharing && (
                            <div className="absolute top-3 right-12 z-20 bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                                <Monitor className="w-3.5 h-3.5" />
                                Sharing Screen
                            </div>
                        )}

                        {/* FLOATING SELF VIEW PiP (SWAPPABLE) */}
                        <div className="absolute bottom-3 right-3 z-20 group cursor-pointer" onClick={() => setSwapView(!swapView)} title="Click to swap views">
                            <div className="relative w-28 h-20 sm:w-36 sm:h-28 bg-slate-900 rounded-xl overflow-hidden border-2 border-indigo-500/80 shadow-2xl transition-transform group-hover:scale-105">
                                <video
                                    ref={swapView ? remoteVideoRef : localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted={!swapView}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-1 left-1.5 bg-slate-950/80 text-[10px] font-bold text-slate-200 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    {swapView ? "Candidate" : "HR (You)"}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* CONTROL ACTION BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleCamera}
                                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${cameraActive ? "bg-slate-800 border-slate-700 text-white" : "bg-rose-500/20 border-rose-500/40 text-rose-300"}`}
                            >
                                {cameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
                                <span className="hidden sm:inline">{cameraActive ? "Cam On" : "Cam Off"}</span>
                            </button>

                            <button
                                onClick={toggleMic}
                                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${micActive ? "bg-slate-800 border-slate-700 text-white" : "bg-rose-500/20 border-rose-500/40 text-rose-300"}`}
                            >
                                {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                                <span className="hidden sm:inline">{micActive ? "Mic On" : "Mic Off"}</span>
                            </button>

                            <button
                                onClick={toggleScreenShare}
                                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${isScreenSharing ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30" : "bg-slate-800 border-slate-700 text-slate-300"}`}
                            >
                                {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4 text-indigo-400" />}
                                <span>{isScreenSharing ? "Stop Screen Share" : "Share Screen"}</span>
                            </button>
                        </div>

                        {/* EXAM SCORE BADGE */}
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                            <Award className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-white">Test Score: {exam?.score ?? "N/A"}%</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: HR EVALUATION NOTES & DECISION PANEL (40% WIDTH ON LG) */}
                <div className="w-full lg:w-5/12 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            HR Evaluation & Notes
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
                            placeholder="Enter interviewer feedback, technical impressions, live coding review..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />

                        {roomId && (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                                <span className="text-slate-400 font-semibold block">Candidate 5-Min Join Link:</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/interview/${roomId}`}
                                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-indigo-300 truncate"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/interview/${roomId}`)
                                            alert("Candidate interview join link copied to clipboard!")
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DECISION ACTION BUTTONS */}
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
                            Send Final Selection & Offer Email
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
