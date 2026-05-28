import { useState } from "react"
import axios from "axios"

const UploadResume = () => {

    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleUpload = async () => {

        if (!file) {
            alert("Please select file")
            return
        }

        try {

            setLoading(true)

            const formData = new FormData()

            formData.append("resume", file)

            const response = await axios.post(
                "http://localhost:5000/upload",
                formData
            )

            console.log(response.data)

            alert("Resume uploaded successfully")

            setFile(null)

        } catch (error) {

            console.log(error)

            alert("Upload failed")
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