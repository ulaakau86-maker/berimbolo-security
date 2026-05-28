import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Appointment API
export const appointmentAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
}

// Job Ticket API
export const jobTicketAPI = {
  getAll: () => api.get('/job-tickets'),
  getById: (id) => api.get(`/job-tickets/${id}`),
  create: (data) => api.post('/job-tickets', data),
  updateStatus: (id, data) => api.patch(`/job-tickets/${id}/status`, data),
  requestParts: (id, data) => api.post(`/job-tickets/${id}/parts`, data),
  getPartsRequests: (id) => api.get(`/job-tickets/${id}/parts`),
}

// Device API
export const deviceAPI = {
  getAll: () => api.get('/devices'),
  getById: (id) => api.get(`/devices/${id}`),
  getByCustomer: (customerId) => api.get(`/devices/customer/${customerId}`),
  create: (data) => api.post('/devices', data),
  update: (id, data) => api.put(`/devices/${id}`, data),
  delete: (id) => api.delete(`/devices/${id}`),
}

// Telemetry API
export const telemetryAPI = {
  send: (data) => api.post('/telemetry', data),
  sendBatch: (data) => api.post('/telemetry/batch', data),
  getByDevice: (deviceId) => api.get(`/telemetry/device/${deviceId}`),
  getSummary: () => api.get('/telemetry/summary'),
  getUnprocessed: () => api.get('/telemetry/unprocessed'),
  markProcessed: (id) => api.patch(`/telemetry/${id}/processed`),
}

export default api
