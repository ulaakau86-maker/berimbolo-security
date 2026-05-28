import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import JobTickets from './pages/JobTickets'
import Devices from './pages/Devices'
import Telemetry from './pages/Telemetry'

function Navigation() {
  const location = useLocation()
  
  return (
    <nav className="navbar">
      <h1>🛡️ Berimbolo Security</h1>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Үндсэн хуудас</Link>
        <Link to="/appointments" className={location.pathname === '/appointments' ? 'active' : ''}>Уулзалтууд</Link>
        <Link to="/job-tickets" className={location.pathname === '/job-tickets' ? 'active' : ''}>Ажлын даалгавар</Link>
        <Link to="/devices" className={location.pathname === '/devices' ? 'active' : ''}>Төхөөрөмжүүд</Link>
        <Link to="/telemetry" className={location.pathname === '/telemetry' ? 'active' : ''}>Телеметр</Link>
      </div>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div>
        <Navigation />
        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/job-tickets" element={<JobTickets />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/telemetry" element={<Telemetry />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
