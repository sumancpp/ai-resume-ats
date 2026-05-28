import { useEffect, useState } from "react"
import axios from "axios"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts"

import { useNavigate } from "react-router-dom"

const Dashboard = () => {

    const [resumes, setResumes] = useState([])

    const navigate = useNavigate()

    useEffect(() => {

        fetchResumes()

    }, [])

    const fetchResumes = async () => {

        try {

            const response =
                await axios.get(
                    `${import.meta.env.VITE_API_URL}/search?query=`
                )

            console.log(response.data)

            setResumes(
                response?.data?.resumes || []
            )

        } catch (error) {

            console.log(error)

            setResumes([])
        }
    }

    // =====================
    // TOTAL RESUMES
    // =====================

    const totalResumes =
        resumes?.length || 0

    // =====================
    // AVERAGE CGPA
    // =====================

    const averageCgpa =
        resumes?.length > 0
            ? (
                resumes.reduce(
                    (acc, curr) =>
                        acc + (curr?.cgpa || 0),
                    0
                ) / resumes.length
            ).toFixed(2)
            : 0

    // =====================
    // UNIQUE COLLEGES
    // =====================

    const uniqueColleges =
        new Set(
            resumes
                ?.filter(r => r?.college)
                ?.map(r => r.college)
        ).size

    // =====================
    // TOP SKILLS
    // =====================

    const skillCount = {}

    resumes?.forEach((resume) => {

        if (resume?.skills?.length > 0) {

            resume.skills.forEach((skill) => {

                if (skillCount[skill]) {

                    skillCount[skill] += 1

                } else {

                    skillCount[skill] = 1
                }
            })
        }
    })

    const chartData =
        Object.entries(skillCount)
            .map(([skill, count]) => ({
                skill,
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)

    return (

        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4 md:p-8 overflow-x-hidden">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}

                <div className="flex flex-col lg:flex-row items-center justify-between gap-5 mb-10">

                    <div>

                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">

                            ATS Analytics Dashboard

                        </h1>

                        <p className="text-gray-600 mt-3 text-base md:text-lg">

                            Smart insights from your AI Resume ATS

                        </p>

                    </div>

                    <button
                        onClick={() => navigate("/")}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-lg hover:scale-105 transition duration-300 font-semibold cursor-pointer"
                    >

                        ← Back To ATS

                    </button>

                </div>

                {/* STATS */}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 mb-10">

                    {/* TOTAL RESUMES */}

                    <div className="bg-white/70 backdrop-blur-lg border border-white/30 rounded-3xl p-8 shadow-2xl hover:-translate-y-2 transition duration-500">

                        <div className="flex items-center justify-between mb-5">

                            <div>

                                <h2 className="text-lg font-semibold text-gray-600">

                                    Total Resumes

                                </h2>

                                <p className="text-5xl font-black text-indigo-700 mt-4">

                                    {totalResumes}

                                </p>

                            </div>

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center text-white text-3xl shadow-lg">

                                📄

                            </div>

                        </div>

                    </div>

                    {/* AVG CGPA */}

                    <div className="bg-white/70 backdrop-blur-lg border border-white/30 rounded-3xl p-8 shadow-2xl hover:-translate-y-2 transition duration-500">

                        <div className="flex items-center justify-between mb-5">

                            <div>

                                <h2 className="text-lg font-semibold text-gray-600">

                                    Average CGPA

                                </h2>

                                <p className="text-5xl font-black text-pink-600 mt-4">

                                    {averageCgpa}

                                </p>

                            </div>

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white text-3xl shadow-lg">

                                🎓

                            </div>

                        </div>

                    </div>

                    {/* COLLEGES */}

                    <div className="bg-white/70 backdrop-blur-lg border border-white/30 rounded-3xl p-8 shadow-2xl hover:-translate-y-2 transition duration-500 sm:col-span-2 xl:col-span-1">

                        <div className="flex items-center justify-between mb-5">

                            <div>

                                <h2 className="text-lg font-semibold text-gray-600">

                                    Total Colleges

                                </h2>

                                <p className="text-5xl font-black text-emerald-600 mt-4">

                                    {uniqueColleges}

                                </p>

                            </div>

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center text-white text-3xl shadow-lg">

                                🏫

                            </div>

                        </div>

                    </div>

                </div>

                {/* CHART */}

                <div className="bg-white/70 backdrop-blur-lg border border-white/30 rounded-3xl p-4 md:p-8 shadow-2xl hover:shadow-purple-300/40 transition duration-500">

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">

                        <div>

                            <h2 className="text-2xl md:text-4xl font-black text-gray-800">

                                Top Skills Analytics

                            </h2>

                            <p className="text-gray-500 mt-2 text-sm md:text-base">

                                Most popular skills from uploaded resumes

                            </p>

                        </div>

                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg">

                            AI Powered Insights

                        </div>

                    </div>

                    {
                        chartData.length > 0
                            ? (

                                <div className="w-full h-[350px] md:h-[500px]">

                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >

                                        <BarChart data={chartData}>

                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis
                                                dataKey="skill"
                                            />

                                            <YAxis />

                                            <Tooltip />

                                            <Bar
                                                dataKey="count"
                                                radius={[10, 10, 0, 0]}
                                            />

                                        </BarChart>

                                    </ResponsiveContainer>

                                </div>

                            )
                            : (

                                <div className="flex items-center justify-center h-[300px]">

                                    <p className="text-2xl font-bold text-gray-500">

                                        No Analytics Data Available

                                    </p>

                                </div>

                            )
                    }

                </div>

            </div>

        </div>
    )
}

export default Dashboard
