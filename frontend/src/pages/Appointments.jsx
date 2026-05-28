import { useState, useEffect } from 'react'
import { appointmentAPI } from '../api/api'

function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    engineerId: '',
    dateTime: '',
    duration: 60,
    type: 'INSTALLATION',
    notes: '',
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadAppointments()
  }, [])

  async function loadAppointments() {
    try {
      const response = await appointmentAPI.getAll()
      setAppointments(response.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load appointments:', error)
      setMessage({ type: 'error', text: 'Уулзалтуудыг ачааллахад алдаа гарлаа' })
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingId) {
        await appointmentAPI.update(editingId, formData)
        setMessage({ type: 'success', text: 'Уулзалтыг амжилттай шинэчиллээ' })
      } else {
        await appointmentAPI.create(formData)
        setMessage({ type: 'success', text: 'Уулзалтыг амжилттай үүсгэлээ' })
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadAppointments()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Уулзалт үүсгэхэд алдаа гарлаа' 
      })
    }
  }

  function handleEdit(appointment) {
    setFormData({
      customerId: appointment.customerId || '',
      customerName: appointment.customerName || '',
      engineerId: appointment.engineerId || '',
      dateTime: new Date(appointment.dateTime).toISOString().slice(0, 16),
      duration: appointment.duration || 60,
      type: appointment.type || 'INSTALLATION',
      notes: appointment.notes || '',
    })
    setEditingId(appointment.id)
    setShowForm(true)
  }

  async function handleDelete(id) {
    if (!confirm('Та энэ уулзалтыг устгахдаа итгэлтэй байна уу?')) return
    try {
      await appointmentAPI.delete(id)
      setMessage({ type: 'success', text: 'Уулзалтыг устгалаа' })
      loadAppointments()
    } catch (error) {
      setMessage({ type: 'error', text: 'Устгахад алдаа гарлаа' })
    }
  }

  function resetForm() {
    setFormData({
      customerId: '',
      customerName: '',
      engineerId: '',
      dateTime: '',
      duration: 60,
      type: 'INSTALLATION',
      notes: '',
    })
  }

  if (loading) {
    return <div className="card">Ачааллаж байна...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>📅 Уулзалтууд</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); resetForm(); setEditingId(null) }}>
          {showForm ? 'Цуцлах' : '+ Шинэ уулзалт'}
        </button>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {showForm && (
        <div className="card">
          <h3>{editingId ? 'Уулзалтыг засварлах' : 'Шинэ уулзалт үүсгэх'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Харилцагчийн нэр</label>
                <input
                  type="text"
                  name="customerName"
                  className="form-control"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Инженерийн ID</label>
                <input
                  type="text"
                  name="engineerId"
                  className="form-control"
                  value={formData.engineerId}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Огноо цаг</label>
                <input
                  type="datetime-local"
                  name="dateTime"
                  className="form-control"
                  value={formData.dateTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Төрөл</label>
                <select
                  name="type"
                  className="form-control"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="INSTALLATION">Суурилуулалт</option>
                  <option value="MAINTENANCE">Засвар үйлчилгээ</option>
                  <option value="REPAIR">Засвар</option>
                  <option value="INSPECTION">Шалгалт</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Хугацаа (минут)</label>
              <input
                type="number"
                name="duration"
                className="form-control"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                step="15"
                required
              />
            </div>
            <div className="form-group">
              <label>Тэмдэглэл</label>
              <textarea
                name="notes"
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
            <button type="submit" className="btn btn-success">
              {editingId ? 'Шинэчлэх' : 'Үүсгэх'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Харилцагч</th>
              <th>Инженер</th>
              <th>Огноо</th>
              <th>Төрөл</th>
              <th>Төлөв</th>
              <th>Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>
                  Уулзалт байхгүй байна
                </td>
              </tr>
            ) : (
              appointments.map(appt => (
                <tr key={appt.id}>
                  <td>{appt.customerName || 'Харилцагч'}</td>
                  <td>Инженер #{appt.engineerId || 'N/A'}</td>
                  <td>{new Date(appt.dateTime).toLocaleString('mn-MN')}</td>
                  <td>{appt.type}</td>
                  <td>
                    <span className={`status-badge status-${appt.status?.toLowerCase()}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-warning" 
                      style={{ marginRight: '8px', padding: '4px 12px' }}
                      onClick={() => handleEdit(appt)}
                    >
                      Засах
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '4px 12px' }}
                      onClick={() => handleDelete(appt.id)}
                    >
                      Устгах
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Appointments
