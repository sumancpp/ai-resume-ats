import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import {
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Play,
    Send,
    Code,
    Sparkles,
    ShieldAlert,
    Check,
    FileCode,
    Award
} from "lucide-react"

import { getBackendUrl } from "../utils/api"

export default function TakeExam() {
    const { token } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [expired, setExpired] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [candidateName, setCandidateName] = useState("")
    const [questions, setQuestions] = useState([])
    const [expiresAt, setExpiresAt] = useState(null)

    // Exam State
    const [examStarted, setExamStarted] = useState(false)
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [answers, setAnswers] = useState({})
    const [codeSubmissions, setCodeSubmissions] = useState({})
    const [testResults, setTestResults] = useState({})
    const [runningCode, setRunningCode] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submittedScore, setSubmittedScore] = useState(null)
    const [submittedFeedback, setSubmittedFeedback] = useState("")

    // Countdown Timer (10 minutes = 600 seconds)
    const [timeLeft, setTimeLeft] = useState(600)

    useEffect(() => {
        verifyToken()
    }, [token])

    useEffect(() => {
        let timer = null
        if (examStarted && !completed && !submitting && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        handleAutoSubmit()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(timer)
    }, [examStarted, completed, submitting, timeLeft])

    const verifyToken = async () => {
        setLoading(true)
        try {
            const backendUrl = getBackendUrl()
            const res = await axios.get(`${backendUrl}/api/exams/verify/${token}`)

            if (res.data.isExpired) {
                setExpired(true)
            } else if (res.data.isCompleted) {
                setCompleted(true)
                setCandidateName(res.data.candidateName)
                setSubmittedScore(res.data.score)
            } else {
                setCandidateName(res.data.candidateName)
                setExpiresAt(res.data.expiresAt)
                setQuestions(res.data.questions || [])

                // Initialize starter code for coding questions
                const initialCode = {}
                res.data.questions.forEach((q) => {
                    if (q.type === "coding") {
                        initialCode[q.id] = q.starterCode || "function solution(input) {\n  return input;\n}"
                    }
                })
                setCodeSubmissions(initialCode)

                if (res.data.startedAt) {
                    setExamStarted(true)
                    const elapsedSecs = Math.floor((new Date() - new Date(res.data.startedAt)) / 1000)
                    const remaining = Math.max(0, 600 - elapsedSecs)
                    setTimeLeft(remaining)
                    if (remaining <= 0) {
                        handleAutoSubmit()
                    }
                }
            }
        } catch (err) {
            if (err.response?.status === 410 || err.response?.data?.isExpired) {
                setExpired(true)
            } else {
                alert(err.response?.data?.message || "Invalid exam access link.")
            }
        } finally {
            setLoading(false)
        }
    }

    const startExamNow = async () => {
        try {
            const backendUrl = getBackendUrl()
            await axios.post(`${backendUrl}/api/exams/start/${token}`)
            setExamStarted(true)
            setTimeLeft(600)
        } catch (err) {
            alert("Error starting exam: " + (err.response?.data?.message || err.message))
        }
    }

    const handleSelectOption = (questionId, optionIndex) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
    }

    const handleCodeChange = (questionId, code) => {
        setCodeSubmissions((prev) => ({ ...prev, [questionId]: code }))
    }

    const handleRunTest = async (question) => {
        setRunningCode(true)
        try {
            const backendUrl = getBackendUrl()
            const code = codeSubmissions[question.id] || ""
            const res = await axios.post(`${backendUrl}/api/exams/run-code`, {
                code,
                testCases: question.testCases
            })

            setTestResults((prev) => ({
                ...prev,
                [question.id]: res.data.testResults
            }))
        } catch (err) {
            alert("Code execution error: " + (err.response?.data?.message || err.message))
        } finally {
            setRunningCode(false)
        }
    }

    const handleAutoSubmit = () => {
        if (!completed && !submitting) {
            handleSubmitExam()
        }
    }

    const handleSubmitExam = async () => {
        setSubmitting(true)
        try {
            const backendUrl = getBackendUrl()

            const formattedCodeSubmissions = Object.keys(codeSubmissions).map((qId) => ({
                questionId: qId,
                code: codeSubmissions[qId]
            }))

            const res = await axios.post(`${backendUrl}/api/exams/submit/${token}`, {
                answers,
                codeSubmissions: formattedCodeSubmissions
            })

            setCompleted(true)
            setSubmittedScore(res.data.score)
            setSubmittedFeedback(res.data.aiFeedback)
        } catch (err) {
            alert("Submission error: " + (err.response?.data?.message || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-medium">Verifying Technical Assessment Security Link...</p>
            </div>
        )
    }

    if (expired) {
        return (
            <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                        <ShieldAlert className="w-8 h-8 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Exam Link Expired</h2>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        This technical assessment invitation link was valid for 24 hours and has now expired.
                        Please reach out to your HR recruiter to request a fresh invitation link.
                    </p>
                    <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-500">
                        Security Status: Link Access Token Expired (410)
                    </div>
                </div>
            </div>
        )
    }

    if (completed) {
        return (
            <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
                <div className="max-w-xl w-full bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                        <Award className="w-10 h-10 text-emerald-400" />
                    </div>

                    <h2 className="text-3xl font-extrabold text-white mb-2">Assessment Submitted!</h2>
                    <p className="text-slate-300 text-base mb-6">
                        Thank you, <strong className="text-indigo-400">{candidateName}</strong>. Your technical test and code evaluations have been recorded.
                    </p>

                    {submittedScore !== null && (
                        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 mb-6 inline-block w-full">
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
                                Automated Technical Score
                            </span>
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                                {submittedScore}%
                            </div>
                        </div>
                    )}

                    {submittedFeedback && (
                        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-left text-sm text-slate-300 mb-6">
                            <span className="text-xs font-semibold text-indigo-400 block mb-1">AI Evaluation Notes:</span>
                            {submittedFeedback}
                        </div>
                    )}

                    <p className="text-xs text-slate-400">
                        Our HR recruiting team will review your code submissions and notify you regarding the Interview round.
                    </p>
                </div>
            </div>
        )
    }

    if (!examStarted) {
        return (
            <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
                <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Technical Skill Assessment</h1>
                            <p className="text-sm text-slate-400">Candidate: {candidateName}</p>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8 space-y-4 text-sm text-slate-300">
                        <h3 className="text-white font-semibold text-base flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                            Important Assessment Rules:
                        </h3>
                        <ul className="space-y-2 list-disc list-inside text-slate-300">
                            <li><strong>Time Limit:</strong> You have exactly <strong>10 minutes</strong> to complete all questions.</li>
                            <li><strong>Question Types:</strong> Includes Technical MCQs and Live Code Challenges.</li>
                            <li><strong>Code Testing:</strong> You can test your code against sample test cases using the <em>Run Test Cases</em> button before submitting.</li>
                            <li><strong>Automatic Submission:</strong> The exam will auto-submit when the countdown hits zero.</li>
                        </ul>
                    </div>

                    <button
                        onClick={startExamNow}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all transform active:scale-95 cursor-pointer text-lg"
                    >
                        <Play className="w-5 h-5 fill-current" />
                        Start 10-Minute Assessment Now
                    </button>
                </div>
            </div>
        )
    }

    const currentQ = questions[currentQIndex]

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Top Bar with Timer */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">TalentAI Assessment</span>
                    <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-xs rounded-full text-indigo-300 font-medium truncate max-w-[150px] sm:max-w-none">
                        Candidate: {candidateName}
                    </span>
                </div>

                {/* Timer Badge */}
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-base sm:text-lg font-bold border transition-colors ${timeLeft < 120 ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"}`}>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </header>

            {/* Main Area */}
            <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
                {/* Left Navigation Panel */}
                <aside className="w-full lg:w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Questions ({questions.length})</h4>
                        <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-2 gap-2">
                            {questions.map((q, idx) => {
                                const isAnswered = q.type === "mcq" ? answers[q.id] !== undefined : !!codeSubmissions[q.id]
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQIndex(idx)}
                                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-between border transition-all cursor-pointer ${idx === currentQIndex ? "bg-indigo-600 text-white border-indigo-400" : isAnswered ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}
                                    >
                                        <span>Q{idx + 1}</span>
                                        <span className="text-[10px] opacity-75 hidden lg:inline">{q.type.toUpperCase()}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmitExam}
                        disabled={submitting}
                        className="mt-4 lg:mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all text-xs sm:text-sm"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? "Submitting..." : "Submit Assessment"}
                    </button>
                </aside>

                {/* Right Question Card */}
                <main className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
                    {currentQ && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <span className="text-sm font-semibold text-indigo-400">
                                    Question {currentQIndex + 1} of {questions.length} ({currentQ.type.toUpperCase()})
                                </span>
                            </div>

                            <p className="text-lg font-medium text-white leading-relaxed">{currentQ.questionText}</p>

                            {/* MCQ Options */}
                            {currentQ.type === "mcq" && (
                                <div className="space-y-3 pt-2">
                                    {currentQ.options?.map((opt, oIdx) => {
                                        const selected = answers[currentQ.id] === oIdx
                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => handleSelectOption(currentQ.id, oIdx)}
                                                className={`w-full text-left p-4 rounded-xl border font-medium transition-all flex items-center justify-between cursor-pointer ${selected ? "bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-md shadow-indigo-500/10" : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700"}`}
                                            >
                                                <span>{opt}</span>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? "border-indigo-400 bg-indigo-600" : "border-slate-600"}`}>
                                                    {selected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Live Code Editor */}
                            {currentQ.type === "coding" && (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                                            <FileCode className="w-4 h-4 text-indigo-400" />
                                            JavaScript Solution Editor
                                        </label>
                                        <button
                                            onClick={() => handleRunTest(currentQ)}
                                            disabled={runningCode}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            {runningCode ? "Executing..." : "Run Test Cases"}
                                        </button>
                                    </div>

                                    <textarea
                                        value={codeSubmissions[currentQ.id] || ""}
                                        onChange={(e) => handleCodeChange(currentQ.id, e.target.value)}
                                        rows={10}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-indigo-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="// Write your solution function here..."
                                    />

                                    {/* Test Results Banner */}
                                    {testResults[currentQ.id] && (
                                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Test Execution Results:</h5>
                                            <div className="space-y-2">
                                                {testResults[currentQ.id].map((tr, idx) => (
                                                    <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${tr.passed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
                                                        <div className="space-y-0.5">
                                                            <div>Input: <span className="text-slate-300">{tr.input}</span></div>
                                                            <div>Expected: <span className="text-slate-300">{tr.expected}</span> | Output: <span className="text-slate-300">{tr.actual}</span></div>
                                                        </div>
                                                        <div className="flex items-center gap-1 font-bold uppercase">
                                                            {tr.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                                                            <span>{tr.passed ? "PASSED" : "FAILED"}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination Buttons */}
                    <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-6">
                        <button
                            onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                            disabled={currentQIndex === 0}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-sm font-semibold rounded-lg cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                            disabled={currentQIndex === questions.length - 1}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-sm font-semibold rounded-lg cursor-pointer"
                        >
                            Next Question
                        </button>
                    </div>
                </main>
            </div>
        </div>
    )
}
