import { useState, useEffect } from 'react'
import { appointmentAPI } from '../api/api'

function Dashboard() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    pendingJobs: 0,
    activeDevices: 0,
    recentAlerts: 0,
  })
  const [recentAppointments, setRecentAppointments] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // Load appointments
      const apptResponse = await appointmentAPI.getAll()
      const appointments = apptResponse.data || []
      setRecentAppointments(appointments.slice(0, 5))
      
      const today = new Date()
      const upcoming = appointments.filter(appt => 
        new Date(appt.dateTime) >= today && 
        appt.status !== 'CANCELLED'
      )

      // Mock stats (in real app, fetch from backend)
      setStats({
        totalAppointments: appointments.length,
        upcomingAppointments: upcoming.length,
        pendingJobs: Math.floor(Math.random() * 10),
        activeDevices: Math.floor(Math.random() * 50) + 20,
        recentAlerts: Math.floor(Math.random() * 5),
      })

      // Mock recent alerts
      setRecentAlerts([
        { id: 1, deviceName: 'CCTV-001', eventType: 'MOTION_DETECTED', timestamp: new Date().toISOString(), severity: 'WARNING' },
        { id: 2, deviceName: 'ALARM-003', eventType: 'ALARM_TRIGGERED', timestamp: new Date().toISOString(), severity: 'CRITICAL' },
        { id: 3, deviceName: 'SENSOR-012', eventType: 'DOOR_OPENED', timestamp: new Date().toISOString(), severity: 'INFO' },
      ])

      setLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card">Ачааллаж байна...</div>
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>📊 Үндсэн самбар</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '32px', color: '#2563eb' }}>{stats.totalAppointments}</h3>
          <p style={{ color: '#6b7280' }}>Нийт уулзалт</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '32px', color: '#16a34a' }}>{stats.upcomingAppointments}</h3>
          <p style={{ color: '#6b7280' }}>Удахгүй болох</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '32px', color: '#ca8a04' }}>{stats.pendingJobs}</h3>
          <p style={{ color: '#6b7280' }}>Хүлээгдэж буй ажил</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '32px', color: '#dc2626' }}>{stats.recentAlerts}</h3>
          <p style={{ color: '#6b7280' }}>Сүүлийн дохиолол</p>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Recent Appointments */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>📅 Сүүлийн уулзалтууд</h3>
          {recentAppointments.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Уулзалт байхгүй байна</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Харилцагч</th>
                  <th>Огноо</th>
                  <th>Төлөв</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map(appt => (
                  <tr key={appt.id}>
                    <td>{appt.customerName || 'Харилцагч'}</td>
                    <td>{new Date(appt.dateTime).toLocaleDateString('mn-MN')}</td>
                    <td>
                      <span className={`status-badge status-${appt.status?.toLowerCase()}`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>⚠️ Сүүлийн дохиоллууд</h3>
          {recentAlerts.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Дохиолол байхгүй байна</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Төхөөрөмж</th>
                  <th>Төрөл</th>
                  <th>Анхааруулга</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map(alert => (
                  <tr key={alert.id}>
                    <td>{alert.deviceName}</td>
                    <td>{alert.eventType}</td>
                    <td>
                      <span className={`status-badge status-${alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY' ? 'cancelled' : alert.severity === 'WARNING' ? 'pending' : 'confirmed'}`}>
                        {alert.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
