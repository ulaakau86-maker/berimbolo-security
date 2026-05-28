import { useState, useEffect } from 'react'
import { jobTicketAPI } from '../api/api'

function JobTickets() {
  const [jobTickets, setJobTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showPartsForm, setShowPartsForm] = useState(false)
  const [partsData, setPartsData] = useState({ partName: '', quantity: 1 })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadJobTickets()
  }, [])

  async function loadJobTickets() {
    try {
      const response = await jobTicketAPI.getAll()
      setJobTickets(response.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load job tickets:', error)
      setMessage({ type: 'error', text: 'Ажлын даалгавруудыг ачааллахад алдаа гарлаа' })
      setLoading(false)
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      await jobTicketAPI.updateStatus(id, { status: newStatus })
      setMessage({ type: 'success', text: 'Төлөвийг шинэчиллээ' })
      loadJobTickets()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Төлөв шинэчлэхэд алдаа гарлаа' 
      })
    }
  }

  async function requestParts(id) {
    try {
      await jobTicketAPI.requestParts(id, partsData)
      setMessage({ type: 'success', text: 'Сэлбэг хэрэгслийн хүсэлт илгээлээ' })
      setShowPartsForm(false)
      setPartsData({ partName: '', quantity: 1 })
      loadJobTickets()
    } catch (error) {
      setMessage({ type: 'error', text: 'Хүсэлт илгээхэд алдаа гарлаа' })
    }
  }

  function getStatusBadgeClass(status) {
    const statusMap = {
      PENDING: 'status-pending',
      IN_PROGRESS: 'status-in-progress',
      COMPLETED: 'status-completed',
      ON_HOLD: 'status-on-hold',
      CANCELLED: 'status-cancelled',
    }
    return statusMap[status] || 'status-pending'
  }

  if (loading) {
    return <div className="card">Ачааллаж байна...</div>
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>🔧 Ажлын даалгаврууд</h2>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {showPartsForm && selectedTicket && (
        <div className="card">
          <h3>Сэлбэг хэрэгсэл захиалах - #{selectedTicket.id}</h3>
          <form onSubmit={(e) => { e.preventDefault(); requestParts(selectedTicket.id) }} style={{ marginTop: '16px' }}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Сэлбэгийн нэр</label>
                <input
                  type="text"
                  className="form-control"
                  value={partsData.partName}
                  onChange={(e) => setPartsData(prev => ({ ...prev, partName: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Тоо хэмжээ</label>
                <input
                  type="number"
                  className="form-control"
                  value={partsData.quantity}
                  onChange={(e) => setPartsData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-success">Илгээх</button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={() => { setShowPartsForm(false); setSelectedTicket(null) }}
              >
                Цуцлах
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-2">
        {jobTickets.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>Ажлын даалгавар байхгүй байна</p>
          </div>
        ) : (
          jobTickets.map(ticket => (
            <div key={ticket.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ marginBottom: '8px' }}>Ажил #${ticket.id}</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    {ticket.appointmentId ? `Уулзалт #${ticket.appointmentId}` : 'Ерөнхий ажил'}
                  </p>
                </div>
                <span className={`status-badge ${getStatusBadgeClass(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p><strong>Тайлбар:</strong> {ticket.description || 'Тайлбар байхгүй'}</p>
                {ticket.engineerNotes && (
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    <strong>Инженерийн тэмдэглэл:</strong> {ticket.engineerNotes}
                  </p>
                )}
              </div>

              {ticket.partsRequested && ticket.partsRequested.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong>Захиалсан сэлбэгүүд:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {ticket.partsRequested.map((part, idx) => (
                      <li key={idx}>{part.partName} x{part.quantity}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ticket.status === 'PENDING' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => updateStatus(ticket.id, 'IN_PROGRESS')}
                  >
                    Эхлүүлэх
                  </button>
                )}
                {ticket.status === 'IN_PROGRESS' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => updateStatus(ticket.id, 'COMPLETED')}
                    >
                      Дуусгах
                    </button>
                    <button 
                      className="btn btn-warning"
                      onClick={() => updateStatus(ticket.id, 'ON_HOLD')}
                    >
                      Түр зогсоох
                    </button>
                  </>
                )}
                {(ticket.status === 'PENDING' || ticket.status === 'ON_HOLD') && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => { setSelectedTicket(ticket); setShowPartsForm(true) }}
                  >
                    Сэлбэг захиалах
                  </button>
                )}
                {(ticket.status === 'PENDING' || ticket.status === 'ON_HOLD') && (
                  <button 
                    className="btn btn-danger"
                    onClick={() => updateStatus(ticket.id, 'CANCELLED')}
                  >
                    Цуцлах
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default JobTickets
