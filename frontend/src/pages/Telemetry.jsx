import { useState, useEffect } from 'react'
import { telemetryAPI } from '../api/api'

function Telemetry() {
  const [telemetryData, setTelemetryData] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [testData, setTestData] = useState({
    deviceId: '',
    eventType: 'MOTION_DETECTED',
    eventData: { triggered: true },
  })

  useEffect(() => {
    loadTelemetry()
    loadSummary()
  }, [])

  async function loadTelemetry() {
    try {
      const response = await telemetryAPI.getUnprocessed()
      setTelemetryData(response.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load telemetry:', error)
      setLoading(false)
    }
  }

  async function loadSummary() {
    try {
      const response = await telemetryAPI.getSummary()
      setSummary(response.data || {})
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }

  async function handleSendTest(e) {
    e.preventDefault()
    try {
      await telemetryAPI.send(testData)
      setMessage({ type: 'success', text: 'Тест дохиог амжилттай илгээлээ' })
      loadTelemetry()
      loadSummary()
    } catch (error) {
      setMessage({ type: 'error', text: 'Дохио илгээхэд алдаа гарлаа' })
    }
  }

  async function markAsProcessed(id) {
    try {
      await telemetryAPI.markProcessed(id)
      setMessage({ type: 'success', text: 'Боловсруулсан гэж тэмдэглэлээ' })
      loadTelemetry()
      loadSummary()
    } catch (error) {
      setMessage({ type: 'error', text: 'Тэмдэглэхэд алдаа гарлаа' })
    }
  }

  function getSeverityColor(severity) {
    const colors = {
      INFO: '#3b82f6',
      WARNING: '#eab308',
      CRITICAL: '#ef4444',
      EMERGENCY: '#7c2d12',
    }
    return colors[severity] || '#6b7280'
  }

  if (loading) {
    return <div className="card">Ачааллаж байна...</div>
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>📡 Телеметр өгөгдөл</h2>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-4" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '32px', color: '#3b82f6' }}>{summary.totalEvents || 0}</h3>
            <p style={{ color: '#6b7280' }}>Нийт үйл явдал</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '32px', color: '#eab308' }}>{summary.warningCount || 0}</h3>
            <p style={{ color: '#6b7280' }}>Анхааруулга</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '32px', color: '#ef4444' }}>{summary.criticalCount || 0}</h3>
            <p style={{ color: '#6b7280' }}>Критик</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '32px', color: '#7c2d12' }}>{summary.emergencyCount || 0}</h3>
            <p style={{ color: '#6b7280' }}>Яаралтай</p>
          </div>
        </div>
      )}

      {/* Send Test Event */}
      <div className="card">
        <h3>🧪 Тест үйл явдал илгээх</h3>
        <form onSubmit={handleSendTest} style={{ marginTop: '16px' }}>
          <div className="grid grid-3">
            <div className="form-group">
              <label>Төхөөрөмжийн ID</label>
              <input
                type="text"
                className="form-control"
                value={testData.deviceId}
                onChange={(e) => setTestData(prev => ({ ...prev, deviceId: e.target.value }))}
                placeholder="DEV-001"
                required
              />
            </div>
            <div className="form-group">
              <label>Үйл явдлын төрөл</label>
              <select
                className="form-control"
                value={testData.eventType}
                onChange={(e) => setTestData(prev => ({ ...prev, eventType: e.target.value }))}
              >
                <option value="MOTION_DETECTED">Хөдөлгөөн илэрсэн</option>
                <option value="ALARM_TRIGGERED">Дохиолол ассан</option>
                <option value="DOOR_OPENED">Хаалг нээгдсэн</option>
                <option value="DOOR_CLOSED">Хаалг хаагдсан</option>
                <option value="GLASS_BREAK">Шил хагарсан</option>
                <option value="SMOKE_DETECTED">Утаа илэрсэн</option>
                <option value="SYSTEM_ONLINE">Систем идэвхжсэн</option>
                <option value="SYSTEM_OFFLINE">Систем унтарсан</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Илгээх
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Recent Events */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3>📋 Сүүлийн үйл явдлууд</h3>
        {telemetryData.length === 0 ? (
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Үйл явдал байхгүй байна</p>
        ) : (
          <table className="table" style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>Цаг хугацаа</th>
                <th>Төхөөрөмж</th>
                <th>Үйл явдал</th>
                <th>Анхааруулга</th>
                <th>Төлөв</th>
                <th>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {telemetryData.map(event => (
                <tr key={event.id}>
                  <td>{new Date(event.timestamp).toLocaleString('mn-MN')}</td>
                  <td>{event.deviceId}</td>
                  <td>{event.eventType}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ 
                        backgroundColor: getSeverityColor(event.severity),
                        color: 'white'
                      }}
                    >
                      {event.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${event.processed ? 'status-completed' : 'status-pending'}`}>
                      {event.processed ? 'Боловсруулсан' : 'Хүлээгдэж буй'}
                    </span>
                  </td>
                  <td>
                    {!event.processed && (
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '4px 12px' }}
                        onClick={() => markAsProcessed(event.id)}
                      >
                        Боловсруулсан
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Telemetry
