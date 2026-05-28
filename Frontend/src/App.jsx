import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom"

import SearchResume from "./components/SearchResume"
import CandidateDetails from "./pages/CandidateDetails"
import Dashboard from "./pages/Dashboard"

function App() {

  return (

    <BrowserRouter>

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

    </BrowserRouter>
  )
}

export default App