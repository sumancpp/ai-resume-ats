import { useLocation } from "react-router-dom"

import {
    Document,
    Page,
    pdfjs
} from "react-pdf"

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const CandidateDetails = () => {

    const location = useLocation()

    const resume = location.state

    const pdfUrl =
        `https://ai-resume-ats-zbbn.onrender.com/${resume.filePath}`

    return (

        <div className="min-h-screen bg-gray-100 p-10">

            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">

                {/* LEFT SIDE */}

                <div className="bg-white p-8 rounded-2xl shadow">

                    <h1 className="text-4xl font-bold mb-6">
                        {resume.name}
                    </h1>

                    <div className="space-y-4">

                        <p>
                            <span className="font-bold">
                                College:
                            </span>

                            {" "}
                            {resume.college}
                        </p>

                        <p>
                            <span className="font-bold">
                                CGPA:
                            </span>

                            {" "}
                            {resume.cgpa}
                        </p>

                        <div>

                            <h2 className="font-bold mb-3 text-xl">
                                Skills
                            </h2>

                            <div className="flex flex-wrap gap-2">

                                {
                                    resume.skills.map((skill, index) => (

                                        <span
                                            key={index}
                                            className="bg-black text-white px-3 py-1 rounded-full"
                                        >
                                            {skill}
                                        </span>
                                    ))
                                }

                            </div>

                        </div>

                    </div>

                </div>

                {/* RIGHT SIDE PDF */}

                <div className="bg-white p-5 rounded-2xl shadow overflow-auto h-[90vh]">

                    <Document
                        file={pdfUrl}
                    >

                        <Page
                            pageNumber={1}
                            width={500}
                        />

                    </Document>

                </div>

            </div>

        </div>
    )
}

export default CandidateDetails
