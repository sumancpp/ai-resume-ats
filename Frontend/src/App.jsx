import {
  BrowserRouter,
  Routes,
  Route,
  useLocation
} from "react-router-dom"

import SearchResume from "./components/SearchResume"
import CandidateDetails from "./pages/CandidateDetails"
import Dashboard from "./pages/Dashboard"
import TakeExam from "./pages/TakeExam"
import LiveInterview from "./pages/LiveInterview"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import ForgotPassword from "./pages/ForgotPassword"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import ProtectedRoute from "./components/ProtectedRoute"

function AppContent() {
  const location = useLocation()
  const isCandidateAssessmentPage = 
    location.pathname.startsWith("/exam") || 
    location.pathname.startsWith("/interview")

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col font-sans">
      {!isCandidateAssessmentPage && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Public Main Landing & Search Showcase */}
          <Route path="/" element={<SearchResume />} />

          {/* Protected Candidate & Dashboard Routes */}
          <Route
            path="/candidate"
            element={
              <ProtectedRoute>
                <CandidateDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/:id"
            element={
              <ProtectedRoute>
                <CandidateDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Public Candidate Assessment Routes */}
          <Route
            path="/exam/:token"
            element={<TakeExam />}
          />
          <Route
            path="/interview/:token"
            element={<LiveInterview />}
          />

          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/signup"
            element={<Signup />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
        </Routes>
      </main>
      {!isCandidateAssessmentPage && <Footer />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App