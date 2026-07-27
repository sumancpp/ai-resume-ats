/**
 * Centralized API Base URL resolver.
 * Prevents host mismatches between localhost:5000 and Render backends.
 */
export const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")
    }
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/$/, "")
    }
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return "http://localhost:5000"
    }
    return "https://ai-resume-atsp-backend.onrender.com"
}
