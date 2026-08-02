import { v2 as cloudinary } from "cloudinary"

const isCloudinaryConfigured = () => {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    )
}

if (isCloudinaryConfigured()) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    })
}

/**
 * Upload file buffer to Cloudinary with automatic fallback if credentials are unset or upload fails.
 * @param {Buffer} fileBuffer 
 * @param {string} originalname 
 * @returns {Promise<string|null>} Cloudinary secure URL if successful, or null to fallback to local storage
 */
export const uploadFileToCloudinary = (fileBuffer, originalname) => {
    return new Promise((resolve) => {
        if (!isCloudinaryConfigured()) {
            return resolve(null)
        }

        const ext = originalname.split(".").pop().toLowerCase()
        const cleanName = originalname
            .replace(/[^a-zA-Z0-9]/g, "_")
            .substring(0, 30)

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "ai_resume_search",
                resource_type: "auto",
                public_id: `${Date.now()}_${cleanName}`,
                format: ext === "pdf" ? "pdf" : undefined
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload failed, falling back to disk:", error.message || error)
                    return resolve(null)
                }
                console.log("Uploaded successfully to Cloudinary:", result.secure_url)
                resolve(result.secure_url)
            }
        )

        uploadStream.end(fileBuffer)
    })
}

export { isCloudinaryConfigured }
export default cloudinary
