import { useState, useEffect } from 'react'
import { deviceAPI } from '../api/api'

function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    deviceType: 'CCTV',
    model: '',
    serialNumber: '',
    location: '',
    isActive: true,
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadDevices()
  }, [])

  async function loadDevices() {
    try {
      const response = await deviceAPI.getAll()
      setDevices(response.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load devices:', error)
      setMessage({ type: 'error', text: 'Төхөөрөмжүүдийг ачааллахад алдаа гарлаа' })
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await deviceAPI.create(formData)
      setMessage({ type: 'success', text: 'Төхөөрөмжийг амжилттай нэмлээ' })
      setShowForm(false)
      resetForm()
      loadDevices()
    } catch (error) {
      setMessage({ type: 'error', text: 'Төхөөрөмж нэмэхэд алдаа гарлаа' })
    }
  }

  function resetForm() {
    setFormData({
      customerId: '',
      customerName: '',
      deviceType: 'CCTV',
      model: '',
      serialNumber: '',
      location: '',
      isActive: true,
    })
  }

  function getDeviceIcon(type) {
    const icons = {
      CCTV: '📹',
      ALARM_PANEL: '🚨',
      MOTION_SENSOR: '🏃',
      DOOR_SENSOR: '🚪',
      GLASS_BREAK: '🪟',
      SMOKE_DETECTOR: '🔥',
      CARBON_MONOXIDE: '⚠️',
    }
    return icons[type] || '📱'
  }

  if (loading) {
    return <div className="card">Ачааллаж байна...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>📱 IoT Төхөөрөмжүүд</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); resetForm() }}>
          {showForm ? 'Цуцлах' : '+ Шинэ төхөөрөмж'}
        </button>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {showForm && (
        <div className="card">
          <h3>Шинэ төхөөрөмж нэмэх</h3>
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
                <label>Төхөөрөмжийн төрөл</label>
                <select
                  name="deviceType"
                  className="form-control"
                  value={formData.deviceType}
                  onChange={handleChange}
                >
                  <option value="CCTV">CCTV Камер</option>
                  <option value="ALARM_PANEL">Дохиоллын самбар</option>
                  <option value="MOTION_SENSOR">Хөдөлгөөний сенсор</option>
                  <option value="DOOR_SENSOR">Хаалганы сенсор</option>
                  <option value="GLASS_BREAK">Шил хагалах детектор</option>
                  <option value="SMOKE_DETECTOR">Утааны детектор</option>
                  <option value="CARBON_MONOXIDE">Нүүрстөрөгчийн дутуу исэл детектор</option>
                </select>
              </div>
              <div className="form-group">
                <label>Загвар</label>
                <input
                  type="text"
                  name="model"
                  className="form-control"
                  value={formData.model}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Серийн дугаар</label>
                <input
                  type="text"
                  name="serialNumber"
                  className="form-control"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Байршил</label>
                <input
                  type="text"
                  name="location"
                  className="form-control"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Жишээ: Гараж, Зочны өрөө, г."
                  required
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <label htmlFor="isActive" style={{ margin: 0 }}>Идэвхтэй</label>
              </div>
            </div>
            <button type="submit" className="btn btn-success">Нэмэх</button>
          </form>
        </div>
      )}

      <div className="grid grid-3">
        {devices.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>Төхөөрөмж байхгүй байна</p>
          </div>
        ) : (
          devices.map(device => (
            <div key={device.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', marginRight: '12px' }}>
                  {getDeviceIcon(device.deviceType)}
                </span>
                <div>
                  <h3 style={{ marginBottom: '4px' }}>{device.deviceType}</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>{device.model}</p>
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '14px' }}><strong>Серийн дугаар:</strong> {device.serialNumber}</p>
                <p style={{ fontSize: '14px' }}><strong>Байршил:</strong> {device.location}</p>
                <p style={{ fontSize: '14px' }}><strong>Харилцагч:</strong> {device.customerName}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`status-badge ${device.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                  {device.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                </span>
                <button className="btn btn-warning" style={{ padding: '4px 12px' }}>
                  Дэлгэрэнгүй
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Devices
