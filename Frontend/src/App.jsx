import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom"

import SearchResume from "./components/SearchResume"
import CandidateDetails from "./pages/CandidateDetails"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={<SearchResume />}
            />
            <Route
              path="/candidate"
              element={<CandidateDetails />}
            />
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />
            <Route
              path="/login"
              element={<Login />}
            />
            <Route
              path="/signup"
              element={<Signup />}
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App