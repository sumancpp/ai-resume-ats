import { useState, useEffect, useRef } from "react"
import { useParams } from "react"
import axios from "axios"
import { io } from "socket.io-client"
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    AlertCircle,
    ShieldCheck,
    Timer,
    PhoneOff,
    ExternalLink,
    MailCheck,
    Lock,
    Maximize2
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ]
}

export default function LiveInterview() {
    const { token } = useParams()

    const [loading, setLoading] = useState(true)
    const [expired, setExpired] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [interviewData, setInterviewData] = useState(null)
    const [secondsRemaining, setSecondsRemaining] = useState(0)

    // Verification and Email state
    const [inputEmail, setInputEmail] = useState("")
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [emailVerified, setEmailVerified] = useState(false)
    const [verificationError, setVerificationError] = useState("")

    // Media and WebRTC states
    const [cameraActive, setCameraActive] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [remotePeerConnected, setRemotePeerConnected] = useState(false)
    const [joinedRoom, setJoinedRoom] = useState(false)
    const [swapView, setSwapView] = useState(false)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    const localStreamRef = useRef(null)
    const screenStreamRef = useRef(null)
    const peerConnectionRef = useRef(null)
    const socketRef = useRef(null)

    useEffect(() => {
        verifyInterview()
        return () => {
            leaveSession()
        }
    }, [token])

    // Bind streams to Video Elements
    useEffect(() => {
        if (!loading && localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [loading, localStream, swapView, joinedRoom])

    useEffect(() => {
        if (!loading && remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [loading, remoteStream, remotePeerConnected, swapView])

    // Countdown Timer Effect
    useEffect(() => {
        let interval = null
        if (secondsRemaining > 0 && !expired) {
            interval = setInterval(() => {
                setSecondsRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        setExpired(true)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [secondsRemaining, expired])

    const formatTime = (totalSecs) => {
        const mins = Math.floor(totalSecs / 60)
        const secs = totalSecs % 60
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`
    }

    const verifyInterview = async () => {
        setLoading(true)
        try {
            const backendUrl = getBackendUrl()
            const res = await axios.get(`${backendUrl}/api/exams/interview-verify/${token}`)

            if (res.data.success) {
                setInterviewData(res.data)
                setInputEmail(res.data.candidateEmail || "")

                if (res.data.expiresAt) {
                    const remaining = Math.max(0, Math.floor((new Date(res.data.expiresAt) - new Date()) / 1000))
                    setSecondsRemaining(remaining)
                    if (remaining <= 0) {
                        setExpired(true)
                    } else {
                        initLocalMedia()
                    }
                } else {
                    initLocalMedia()
                }
            }
        } catch (err) {
            if (err.response?.status === 410 || err.response?.data?.isExpired) {
                setExpired(true)
            } else {
                setErrorMsg(err.response?.data?.message || "Invalid or non-existent interview join link.")
            }
        } finally {
            setLoading(false)
        }
    }

    const initLocalMedia = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            localStreamRef.current = mediaStream
            setLocalStream(mediaStream)
            setCameraActive(true)
            setMicActive(true)
        } catch (err) {
            console.warn("Camera/Mic permission warning:", err)
        }
    }

    // Verify candidate email & Join Google Meet
    const handleJoinGoogleMeet = async (e) => {
        if (e) e.preventDefault()
        if (!inputEmail.trim()) {
            setVerificationError("Please enter your registered candidate email address.")
            return
        }

        setVerifyingEmail(true)
        setVerificationError("")

        try {
            const backendUrl = getBackendUrl()
            const res = await axios.post(`${backendUrl}/api/exams/candidate-joined-meet/${token}`, {
                email: inputEmail.trim()
            })

            if (res.data.success) {
                setEmailVerified(true)

                // Emit Socket notification to HR in real-time
                const socket = socketRef.current || io(backendUrl)
                socketRef.current = socket
                socket.emit("join-interview-room", {
                    roomId: token,
                    userRole: "candidate",
                    userName: interviewData?.candidateName || "Candidate"
                })
                socket.emit("candidate-waiting-in-meet", {
                    roomId: token,
                    candidateName: interviewData?.candidateName || "Candidate",
                    candidateEmail: inputEmail.trim()
                })

                // Open Google Meet link in new tab
                const meetUrl = res.data.meetLink || interviewData?.meetLink || `https://meet.google.com`
                window.open(meetUrl, "_blank")
            }
        } catch (err) {
            setVerificationError(err.response?.data?.message || "Email verification failed. Please check your candidate email.")
        } finally {
            setVerifyingEmail(false)
        }
    }

    // WebRTC Session
    const joinSession = async () => {
        if (!token) return
        setJoinedRoom(true)

        const backendUrl = getBackendUrl()
        const socket = socketRef.current || io(backendUrl)
        socketRef.current = socket

        socket.on("connect", () => {
            socket.emit("join-interview-room", {
                roomId: token,
                userRole: "candidate",
                userName: interviewData?.candidateName || "Candidate"
            })
        })

        socket.on("user-joined", async () => {
            setRemotePeerConnected(true)
            await createWebRTCOffer()
        })

        socket.on("webrtc-offer", async ({ offer }) => {
            setRemotePeerConnected(true)
            await handleWebRTCOffer(offer)
        })

        socket.on("webrtc-answer", async ({ answer }) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
            }
        })

        socket.on("ice-candidate", async ({ candidate }) => {
            if (peerConnectionRef.current && candidate) {
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (err) {
                    console.error("ICE error:", err)
                }
            }
        })

        socket.on("user-left", () => {
            setRemotePeerConnected(false)
            setRemoteStream(null)
        })
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
            setRemotePeerConnected(true)
            if (event.streams[0]) {
                setRemoteStream(event.streams[0])
            }
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("ice-candidate", {
                    roomId: token,
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
            socketRef.current.emit("webrtc-offer", { roomId: token, offer })
        }
    }

    const handleWebRTCOffer = async (offer) => {
        const pc = getOrCreatePeerConnection()
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        if (socketRef.current) {
            socketRef.current.emit("webrtc-answer", { roomId: token, answer })
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
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                const screenTrack = screenStream.getVideoTracks()[0]

                if (peerConnectionRef.current) {
                    const senders = peerConnectionRef.current.getSenders()
                    const videoSender = senders.find((s) => s.track && s.track.kind === "video")
                    if (videoSender) {
                        videoSender.replaceTrack(screenTrack)
                    }
                }

                screenTrack.onended = () => stopScreenShare()
                screenStreamRef.current = screenStream
                setIsScreenSharing(true)

                if (socketRef.current) {
                    socketRef.current.emit("screen-share-status", { roomId: token, isSharing: true, userRole: "candidate" })
                }
            } catch (err) {
                console.error("Screen share error:", err)
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
            socketRef.current.emit("screen-share-status", { roomId: token, isSharing: false, userRole: "candidate" })
        }
    }

    const leaveSession = () => {
        stopScreenShare()
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop())
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        if (socketRef.current) {
            socketRef.current.emit("leave-interview-room", { roomId: token })
            socketRef.current.disconnect()
            socketRef.current = null
        }
        setJoinedRoom(false)
        setRemotePeerConnected(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-semibold text-slate-400">Verifying Google Meet Join Link...</p>
            </div>
        )
    }

    if (expired) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                        <Clock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">Interview Link Expired (5 Min Window Passed)</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        This video interview invitation link has EXPIRED after the 5-minute joining window. Please contact HR to request a new join link.
                    </p>
                </div>
            </div>
        )
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">Access Error</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">{errorMsg}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8 flex flex-col justify-between max-w-7xl mx-auto w-full space-y-6">
            
            {/* TOP HEADER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-extrabold text-white">Google Meet Video Interview Portal</h1>
                        <p className="text-xs text-slate-400">Verified Candidate Access & Live Meeting Room</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {secondsRemaining > 0 && (
                        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold text-rose-400 animate-pulse">
                            <Timer className="w-4 h-4" />
                            <span>Join Window: {formatTime(secondsRemaining)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-400 font-semibold">
                        <ShieldCheck className="w-4 h-4" />
                        Verified Email Required
                    </div>
                </div>
            </div>

            {/* VERIFIED EMAIL CHECK & GOOGLE MEET ENTRY CARD */}
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto w-full space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                        <MailCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">Candidate Email Verification</h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        To maintain secure recruitment standards, you MUST join Google Meet using your registered candidate email address.
                    </p>
                </div>

                <form onSubmit={handleJoinGoogleMeet} className="space-y-4 max-w-md mx-auto">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            Registered Candidate Email:
                        </label>
                        <input
                            type="email"
                            value={inputEmail}
                            onChange={(e) => setInputEmail(e.target.value)}
                            placeholder="Enter your verified email"
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-emerald-500 shadow-inner"
                            required
                        />
                    </div>

                    {verificationError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {verificationError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={verifyingEmail}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <ExternalLink className="w-4 h-4" />
                        {verifyingEmail ? "Verifying Email..." : "Verify & Open Google Meet Interview Room"}
                    </button>
                </form>

                {interviewData?.meetLink && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                        <span className="text-xs font-semibold text-slate-400 block">Direct Google Meet URL:</span>
                        <a
                            href={interviewData.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-mono font-bold text-indigo-400 hover:text-indigo-300 underline break-all inline-block"
                        >
                            {interviewData.meetLink}
                        </a>
                    </div>
                )}
            </div>

            {/* WEBRTC BACKUP PREVIEW STAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hardware Pre-Flight Feed</span>
                        <span className="text-xs text-slate-400 font-medium">Alternative Web Player</span>
                    </div>

                    <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                        <video
                            ref={swapView ? localVideoRef : remoteVideoRef}
                            autoPlay
                            playsInline
                            muted={swapView}
                            className="w-full h-full object-cover"
                        />

                        {!remotePeerConnected && !swapView && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-slate-950/80 backdrop-blur-sm">
                                <Video className="w-8 h-8 text-slate-500" />
                                <p className="text-xs text-slate-400">Pre-flight camera preview active</p>
                            </div>
                        )}

                        <div className="absolute bottom-3 right-3 z-20" onClick={() => setSwapView(!swapView)}>
                            <div className="w-28 h-20 bg-slate-900 rounded-xl overflow-hidden border-2 border-indigo-500">
                                <video
                                    ref={swapView ? remoteVideoRef : localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted={!swapView}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2">
                            <button onClick={toggleCamera} className="p-2.5 bg-slate-800 rounded-xl text-white text-xs font-semibold cursor-pointer">
                                {cameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                            </button>
                            <button onClick={toggleMic} className="p-2.5 bg-slate-800 rounded-xl text-white text-xs font-semibold cursor-pointer">
                                {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                            </button>
                        </div>
                        <button onClick={joinSession} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer">
                            {joinedRoom ? "Connected to WebRTC" : "Connect Backup WebRTC"}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Candidate Instructions</span>
                    <h3 className="text-lg font-bold text-white">{interviewData?.candidateName}</h3>
                    <p className="text-xs text-slate-400">{interviewData?.candidateEmail}</p>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2 text-slate-400">
                        <div className="flex items-center justify-between text-slate-300 font-semibold">
                            <span>Google Meet Status:</span>
                            <span className={emailVerified ? "text-emerald-400" : "text-amber-400"}>
                                {emailVerified ? "Verified & Joined" : "Pending Verification"}
                            </span>
                        </div>
                        <p className="leading-relaxed text-[11px] pt-1">
                            HR will be notified instantly when you join the Google Meet room.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    )
}
