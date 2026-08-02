import { useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"

const UploadResume = () => {

    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleUpload = async () => {

        if (!file) {
            toast.error("Please select a file")
            return
        }

        try {

            setLoading(true)

            const formData = new FormData()

            formData.append("resume", file)

            const apiUrl = import.meta.env.VITE_API_URL || "https://ai-resume-atsp-backend.onrender.com"
            const response = await axios.post(
                `${apiUrl}/upload`,
                formData
            )

            console.log(response.data)

            toast.success("Resume uploaded successfully")

            setFile(null)

        } catch (error) {

            console.log(error)

            toast.error("Upload failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                padding: "40px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                width: "400px",
                margin: "auto",
                marginTop: "100px"
            }}
        >

            <h1>Upload Resume</h1>

            <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files[0])}
            />

            <button onClick={handleUpload}>

                {
                    loading
                        ? "Uploading..."
                        : "Upload Resume"
                }

            </button>

        </div>
    )
}

export default UploadResume
