import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom"

import SearchResume from "./components/SearchResume"
import CandidateDetails from "./pages/CandidateDetails"
import Dashboard from "./pages/Dashboard"
import Navbar from "./components/Navbar"

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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App