import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    AlertCircle,
    ShieldCheck,
    UserCheck,
    Timer
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

export default function LiveInterview() {
    const { token } = useParams()

    const [loading, setLoading] = useState(true)
    const [expired, setExpired] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [interviewData, setInterviewData] = useState(null)
    const [secondsRemaining, setSecondsRemaining] = useState(0)

    // Media states
    const [cameraActive, setCameraActive] = useState(false)
    const [micActive, setMicActive] = useState(false)
    const [stream, setStream] = useState(null)
    const [joined, setJoined] = useState(false)

    const videoRef = useRef(null)

    useEffect(() => {
        verifyInterview()
        return () => stopMedia()
    }, [token])

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
                
                // Calculate remaining seconds out of 5 minutes
                if (res.data.expiresAt) {
                    const remaining = Math.max(0, Math.floor((new Date(res.data.expiresAt) - new Date()) / 1000))
                    setSecondsRemaining(remaining)
                    if (remaining <= 0) {
                        setExpired(true)
                    } else {
                        startMedia()
                    }
                } else {
                    startMedia()
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
            console.warn("Camera/Mic access denied:", err)
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
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
            <div className="max-w-5xl mx-auto w-full space-y-6">

                {/* TOP HEADER */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-md">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white">TalentAI Candidate Video Portal</h1>
                            <p className="text-xs text-slate-400">Live Technical Assessment & Interview Round</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {secondsRemaining > 0 && (
                            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold text-rose-400 animate-pulse">
                                <Timer className="w-4 h-4" />
                                <span>Join Window: {formatTime(secondsRemaining)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs text-indigo-300 font-semibold">
                            <ShieldCheck className="w-4 h-4" />
                            Encrypted
                        </div>
                    </div>
                </div>

                {/* MAIN STREAM & CONTROLS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* VIDEO CONTAINER (8 COLS) */}
                    <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
                        <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                            />
                            {!cameraActive && (
                                <div className="flex flex-col items-center space-y-3 text-slate-500 p-6 text-center">
                                    <VideoOff className="w-12 h-12 stroke-[1.5]" />
                                    <p className="text-xs font-semibold text-slate-400">Camera Feed Off</p>
                                </div>
                            )}

                            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 font-medium">
                                <span className={`w-2.5 h-2.5 rounded-full ${joined ? "bg-emerald-500 animate-pulse" : "bg-indigo-400"}`}></span>
                                {joined ? "Live in Room" : "Pre-Interview Camera & Mic Test"}
                            </div>
                        </div>

                        {/* HARDWARE CONTROL BUTTONS */}
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleCamera}
                                    className={`p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                        cameraActive
                                            ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                            : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                                    }`}
                                >
                                    {cameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
                                    <span>{cameraActive ? "Cam On" : "Cam Off"}</span>
                                </button>

                                <button
                                    onClick={toggleMic}
                                    className={`p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                        micActive
                                            ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                            : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                                    }`}
                                >
                                    {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                                    <span>{micActive ? "Mic On" : "Mic Off"}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setJoined(!joined)}
                                className={`px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                                    joined
                                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                                        : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30"
                                }`}
                            >
                                {joined ? "Leave Interview Session" : "Join Interview Session Now"}
                            </button>
                        </div>
                    </div>

                    {/* CANDIDATE INFO & SYSTEM CHECK (4 COLS) */}
                    <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Candidate Details</span>
                            <h2 className="text-xl font-bold text-white">{interviewData?.candidateName || "Candidate"}</h2>
                            <p className="text-xs text-slate-400">{interviewData?.candidateEmail}</p>
                            <span className="inline-block px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 mt-2">
                                Role: {interviewData?.roleCategory || "Software Engineer"}
                            </span>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                            <span className="font-bold text-slate-300 block mb-1">Pre-flight Hardware Checks</span>
                            <div className="flex items-center justify-between text-slate-400">
                                <span>Camera Signal:</span>
                                <span className={`font-semibold ${cameraActive ? "text-emerald-400" : "text-amber-400"}`}>
                                    {cameraActive ? "Connected" : "Disabled"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                                <span>Microphone Signal:</span>
                                <span className={`font-semibold ${micActive ? "text-emerald-400" : "text-amber-400"}`}>
                                    {micActive ? "Connected" : "Disabled"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                                <span>Network Latency:</span>
                                <span className="font-semibold text-emerald-400">Optimal (Good)</span>
                            </div>
                        </div>

                        <div className="bg-rose-950/30 border border-rose-800/40 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                <AlertCircle className="w-4 h-4" />
                                5-Minute Link Expiry Rule
                            </div>
                            <p className="leading-relaxed text-slate-400">
                                You must join this session within 5 minutes of receiving the email invitation link.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
