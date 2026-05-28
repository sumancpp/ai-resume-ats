import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const SearchResume = () => {

    const [files, setFiles] = useState([])
    const [query, setQuery] = useState("")
    const [resumes, setResumes] = useState([])
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    // =====================
    // UPLOAD RESUMES
    // =====================

    const handleUpload = async () => {

        if (files.length === 0) {

            alert("Select resumes first")
            return
        }

        try {

            setLoading(true)

            const formData = new FormData()

            for (let i = 0; i < files.length; i++) {

                formData.append(
                    "resumes",
                    files[i]
                )
            }

            const response = await axios.post(
                "http://localhost:5000/upload",
                formData
            )

            console.log(response.data)

            alert(
                `${response.data.count} resumes uploaded`
            )

        } catch (error) {

            console.log(error)

            alert("Upload failed")

        } finally {

            setLoading(false)
        }
    }

    // =====================
    // SEMANTIC AI SEARCH
    // =====================

    const handleSearch = async () => {

        if (!query.trim()) {

            alert("Enter search query")
            return
        }

        try {

            setLoading(true)

            const response = await axios.get(
                "http://localhost:5000/ai-search",
                {
                    params: {
                        query
                    }
                }
            )

            console.log(response.data)

            setResumes(
                response.data.resumes || []
            )

        } catch (error) {

            console.log(error)

            alert("Search failed")

        } finally {

            setLoading(false)
        }
    }

    return (

        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4 md:p-8">

            {/* HEADER */}

            <div className="max-w-7xl mx-auto">

                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-5">

                    <div>

                        <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">

                            AI Resume ATS

                        </h1>

                        <p className="text-gray-600 mt-3 text-lg">

                            Smart Semantic AI Powered Hiring Platform

                        </p>

                    </div>

                    {/* DASHBOARD BUTTON */}

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-lg hover:scale-105 transition duration-300 font-semibold cursor-pointer"
                    >

                        Go To Dashboard →

                    </button>

                </div>

                {/* UPLOAD + SEARCH */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">

                    {/* UPLOAD SECTION */}

                    <div className="backdrop-blur-lg bg-white/70 border border-white/30 rounded-3xl shadow-2xl p-6 md:p-8 hover:scale-[1.02] transition duration-300">

                        <h2 className="text-3xl font-bold mb-6 text-indigo-700">

                            Upload Resumes

                        </h2>

                        <div className="border-2 border-dashed border-indigo-400 rounded-3xl p-8 text-center bg-indigo-50">

                            <input
                                type="file"
                                multiple
                                accept=".pdf,.docx"
                                onChange={(e) =>
                                    setFiles(e.target.files)
                                }
                                className="w-full cursor-pointer"
                            />

                            <p className="text-gray-500 mt-4">

                                Upload multiple PDF/DOCX resumes

                            </p>

                        </div>

                        <button
                            onClick={handleUpload}
                            className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-105 transition duration-300 cursor-pointer"
                        >

                            {
                                loading
                                    ? "Uploading..."
                                    : "Upload Resumes"
                            }

                        </button>

                    </div>

                    {/* SEARCH SECTION */}

                    <div className="backdrop-blur-lg bg-white/70 border border-white/30 rounded-3xl shadow-2xl p-6 md:p-8 hover:scale-[1.02] transition duration-300">

                        <h2 className="text-3xl font-bold mb-6 text-pink-700">

                            Semantic AI Search

                        </h2>

                        <div className="space-y-5">

                            <textarea
                                rows={5}
                                placeholder="Need frontend developer with React, Tailwind, UI skills and good projects..."
                                value={query}
                                onChange={(e) =>
                                    setQuery(e.target.value)
                                }
                                className="w-full border-2 border-pink-200 focus:border-pink-500 outline-none p-5 rounded-2xl resize-none bg-white/80"
                            />

                            <button
                                onClick={handleSearch}
                                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-105 transition duration-300 cursor-pointer"
                            >

                                {
                                    loading
                                        ? "Searching..."
                                        : "Run Semantic AI Search"
                                }

                            </button>

                        </div>

                    </div>

                </div>

                {/* RESULTS */}

                <div>

                    <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">

                        Candidate Results

                    </h2>

                    {
                        resumes.length === 0 ? (

                            <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-10 text-center text-gray-500 shadow-xl">

                                No candidates found yet

                            </div>

                        ) : (

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

                                {
                                    resumes.map((resume) => (

                                        <div
                                            key={resume._id}

                                            onClick={() =>
                                                navigate(
                                                    "/candidate",
                                                    {
                                                        state: resume
                                                    }
                                                )
                                            }

                                            className="group bg-white/70 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl p-6 cursor-pointer hover:-translate-y-2 hover:shadow-purple-300/50 transition duration-500"
                                        >

                                            {/* TOP */}

                                            <div className="flex items-start justify-between mb-5">

                                                <div>

                                                    <h2 className="text-2xl font-bold text-gray-800 group-hover:text-purple-700 transition">

                                                        {resume.name}

                                                    </h2>

                                                    <p className="text-sm text-gray-500 mt-1">

                                                        {resume.college}

                                                    </p>

                                                </div>

                                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-2xl font-bold shadow-lg">

                                                    {resume.score}

                                                </div>

                                            </div>

                                            {/* AI REASON */}

                                            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-5">

                                                <p className="text-gray-700 text-sm leading-relaxed">

                                                    {resume.reason}

                                                </p>

                                            </div>

                                            {/* CGPA */}

                                            <div className="flex items-center justify-between mb-5">

                                                <p className="font-semibold text-gray-700">

                                                    CGPA

                                                </p>

                                                <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold">

                                                    {resume.cgpa}

                                                </div>

                                            </div>

                                            {/* SKILLS */}

                                            <div className="flex flex-wrap gap-2">

                                                {
                                                    resume.skills?.map(
                                                        (skill, index) => (

                                                            <span
                                                                key={index}
                                                                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-md"
                                                            >

                                                                {skill}

                                                            </span>
                                                        )
                                                    )
                                                }

                                            </div>

                                        </div>
                                    ))
                                }

                            </div>
                        )
                    }

                </div>

            </div>

        </div>
    )
}

export default SearchResume
