import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom"

import SearchResume from "./components/SearchResume"
import CandidateDetails from "./pages/CandidateDetails"
import Dashboard from "./pages/Dashboard"
import TakeExam from "./pages/TakeExam"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import ForgotPassword from "./pages/ForgotPassword"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Protected Routes - Only accessible when logged in */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SearchResume />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate"
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

            {/* Public Exam Assessment Route */}
            <Route
              path="/exam/:token"
              element={<TakeExam />}
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
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App