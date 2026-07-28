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
    RefreshCw,
    UserCheck,
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

    // Media and WebRTC states
    const [cameraActive, setCameraActive] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [remotePeerConnected, setRemotePeerConnected] = useState(false)
    const [joinedRoom, setJoinedRoom] = useState(false)
    const [swapView, setSwapView] = useState(false) // Swap main and PiP streams

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

    // Initialize Camera and Microphone
    const initLocalMedia = async () => {
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
        } catch (err) {
            console.warn("Camera/Mic permission warning:", err)
        }
    }

    // Join WebRTC Video Call Room
    const joinSession = async () => {
        if (!token) return
        setJoinedRoom(true)

        const backendUrl = getBackendUrl()
        const socket = io(backendUrl)
        socketRef.current = socket

        socket.on("connect", () => {
            console.log("Candidate connected to WebRTC signaling:", socket.id)
            socket.emit("join-interview-room", {
                roomId: token,
                userRole: "candidate",
                userName: interviewData?.candidateName || "Candidate"
            })
        })

        // WebRTC Signaling Events
        socket.on("user-joined", async ({ userRole }) => {
            console.log("Peer joined room:", userRole)
            setRemotePeerConnected(true)
            await createWebRTCOffer()
        })

        socket.on("webrtc-offer", async ({ offer }) => {
            console.log("Received WebRTC Offer from HR")
            setRemotePeerConnected(true)
            await handleWebRTCOffer(offer)
        })

        socket.on("webrtc-answer", async ({ answer }) => {
            console.log("Received WebRTC Answer from HR")
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

    // Setup WebRTC Peer Connection
    const getOrCreatePeerConnection = () => {
        if (peerConnectionRef.current) return peerConnectionRef.current

        const pc = new RTCPeerConnection(ICE_SERVERS)
        peerConnectionRef.current = pc

        // Add local tracks to peer connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current)
            })
        }

        // Handle remote stream tracks
        pc.ontrack = (event) => {
            console.log("Candidate received remote stream track")
            setRemotePeerConnected(true)
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0]
            }
        }

        // Handle ICE candidates
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

    // Toggle Camera
    const toggleCamera = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setCameraActive(videoTrack.enabled)
            }
        }
    }

    // Toggle Microphone
    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setMicActive(audioTrack.enabled)
            }
        }
    }

    // Screen Sharing Toggle
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
                        roomId: token,
                        isSharing: true,
                        userRole: "candidate"
                    })
                }
            } catch (err) {
                console.error("Screen sharing permission denied:", err)
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
                roomId: token,
                isSharing: false,
                userRole: "candidate"
            })
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
                <p className="text-sm font-semibold text-slate-400">Verifying Video Interview Join Link...</p>
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
                        This video interview invitation link has EXPIRED after the 5-minute joining window. Please contact HR or your hiring manager to request a new join link.
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
        <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8 flex flex-col justify-between max-w-7xl mx-auto w-full">
            
            {/* TOP HEADER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-extrabold text-white">TalentAI Candidate Video Portal</h1>
                        <p className="text-xs text-slate-400">Live WebRTC Interview & Screen Share Session</p>
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
                        {remotePeerConnected ? "HR Connected Live" : "Waiting for HR"}
                    </div>
                </div>
            </div>

            {/* BIGGER VIDEO STAGE (2-COLUMN GRID / RESPONSIVE) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
                
                {/* BIG MAIN STAGE VIDEO (8 COLS) */}
                <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl space-y-4 flex flex-col justify-between min-h-[500px] sm:min-h-[600px]">
                    
                    {/* VIDEO FRAME WITH FLOATING PiP */}
                    <div className="relative w-full aspect-video sm:min-h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-2xl">
                        
                        {/* MAIN STREAM: REMOTE HR STREAM (OR SWAPPED LOCAL STREAM) */}
                        <video
                            ref={swapView ? localVideoRef : remoteVideoRef}
                            autoPlay
                            playsInline
                            muted={swapView}
                            className="w-full h-full object-cover"
                        />

                        {!remotePeerConnected && !swapView && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90 backdrop-blur-sm z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center animate-pulse">
                                    <Video className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-white">HR Interviewer Has Not Joined Yet</h3>
                                <p className="text-xs text-slate-400 max-w-sm">
                                    Click <strong>"Join Interview Session Now"</strong> below. When HR opens the live console, your high-definition video call will connect automatically.
                                </p>
                            </div>
                        )}

                        {/* STATUS BADGES */}
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full text-xs font-semibold text-white">
                            <span className={`w-2.5 h-2.5 rounded-full ${joinedRoom ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                            <span>{joinedRoom ? (remotePeerConnected ? "HR Evaluator Live" : "In Live Room") : "Hardware Pre-Flight Check"}</span>
                        </div>

                        {isScreenSharing && (
                            <div className="absolute top-4 right-4 z-20 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                                <Monitor className="w-3.5 h-3.5" />
                                Sharing Your Screen
                            </div>
                        )}

                        {/* FLOATING SELF-VIEW PIP OVERLAY (SWAPPABLE) */}
                        <div className="absolute bottom-4 right-4 z-20 group cursor-pointer" onClick={() => setSwapView(!swapView)} title="Click to swap views">
                            <div className="relative w-32 h-24 sm:w-44 sm:h-32 bg-slate-900 rounded-xl overflow-hidden border-2 border-indigo-500/80 shadow-2xl transition-transform group-hover:scale-105">
                                <video
                                    ref={swapView ? remoteVideoRef : localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted={!swapView}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-1.5 left-2 bg-slate-950/80 text-[10px] font-bold text-slate-200 px-2 py-0.5 rounded backdrop-blur-sm">
                                    {swapView ? "HR Feed" : "You"}
                                </div>
                                <button className="absolute top-1.5 right-1.5 p-1 bg-slate-950/80 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* CONTROL ACTION BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800">
                        
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* CAM TOGGLE */}
                            <button
                                onClick={toggleCamera}
                                className={`p-2.5 sm:p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                    cameraActive
                                        ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                        : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                                }`}
                            >
                                {cameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
                                <span className="hidden sm:inline">{cameraActive ? "Cam On" : "Cam Off"}</span>
                            </button>

                            {/* MIC TOGGLE */}
                            <button
                                onClick={toggleMic}
                                className={`p-2.5 sm:p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                    micActive
                                        ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                        : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                                }`}
                            >
                                {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                                <span className="hidden sm:inline">{micActive ? "Mic On" : "Mic Off"}</span>
                            </button>

                            {/* SCREEN SHARE TOGGLE */}
                            <button
                                onClick={toggleScreenShare}
                                className={`p-2.5 sm:p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                    isScreenSharing
                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                }`}
                            >
                                {isScreenSharing ? <MonitorOff className="w-4 h-4 text-white" /> : <Monitor className="w-4 h-4 text-indigo-400" />}
                                <span>{isScreenSharing ? "Stop Screen Share" : "Share Screen"}</span>
                            </button>
                        </div>

                        {/* JOIN / LEAVE ROOM BUTTON */}
                        {!joinedRoom ? (
                            <button
                                onClick={joinSession}
                                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                            >
                                Join Interview Session Now
                            </button>
                        ) : (
                            <button
                                onClick={leaveSession}
                                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
                            >
                                <PhoneOff className="w-4 h-4" />
                                Leave Session
                            </button>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR: CANDIDATE SUMMARY & INSTRUCTIONS (4 COLS) */}
                <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Candidate Interview Portal</span>
                        <h2 className="text-xl font-bold text-white">{interviewData?.candidateName || "Candidate"}</h2>
                        <p className="text-xs text-slate-400 truncate">{interviewData?.candidateEmail}</p>
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 mt-1">
                            Role: {interviewData?.roleCategory || "Software Engineer"}
                        </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                        <span className="font-bold text-slate-300 block mb-1">Live Connection Status</span>
                        <div className="flex items-center justify-between text-slate-400">
                            <span>WebRTC Signal:</span>
                            <span className={`font-semibold ${joinedRoom ? "text-emerald-400" : "text-amber-400"}`}>
                                {joinedRoom ? "Active" : "Standby"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span>HR Interviewer:</span>
                            <span className={`font-semibold ${remotePeerConnected ? "text-emerald-400" : "text-slate-500"}`}>
                                {remotePeerConnected ? "Connected" : "Not Joined"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                            <span>Screen Sharing:</span>
                            <span className={`font-semibold ${isScreenSharing ? "text-indigo-400" : "text-slate-500"}`}>
                                {isScreenSharing ? "Active" : "Off"}
                            </span>
                        </div>
                    </div>

                    <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                            <Sparkles className="w-4 h-4" />
                            Live Interview Guidelines
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                            <li>Ensure camera and microphone permissions are granted.</li>
                            <li>You can share your screen during coding or architecture discussions.</li>
                            <li>Click the bottom-right self window to swap views.</li>
                        </ul>
                    </div>
                </div>

            </div>

        </div>
    )
}
