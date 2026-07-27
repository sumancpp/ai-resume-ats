/**
 * Centralized API Base URL resolver.
 * Ensures local development seamlessly connects to local backend (http://localhost:5000),
 * avoiding 404 missing PDF file errors from production Render host.
 */
export const getBackendUrl = () => {
    // 1. If explicitly set via VITE_BACKEND_URL in environment, use it
    if (import.meta.env.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")
    }

    // 2. If running locally in browser (localhost / 127.0.0.1), ALWAYS use local backend
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return "http://localhost:5000"
    }

    // 3. Deployed production environment fallback
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/$/, "")
    }

    return "https://ai-resume-atsp-backend.onrender.com"
}
