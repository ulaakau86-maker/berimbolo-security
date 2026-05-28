/**
 * Berimbolo Security - Express API Routes
 * Main application entry point with all API endpoints
 */

const express = require('express');
const router = express.Router();

// Import controllers
const appointmentController = require('./controllers/appointmentController');
const jobTicketController = require('./controllers/jobTicketController');
const telemetryController = require('./controllers/telemetryController');

/* ===========================================
   APPOINTMENT ROUTES
   For customers to create and manage appointments
   =========================================== */

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment (customer books a service visit)
 * @access  Public (would be protected with auth in production)
 * @body    { customerId, engineerId, scheduledAt, duration, notes }
 */
router.post('/appointments', appointmentController.createAppointment);

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments with optional filters
 * @access  Public
 * @query   customerId, engineerId, status, startDate, endDate
 */
router.get('/appointments', appointmentController.getAllAppointments);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get a single appointment by ID
 * @access  Public
 */
router.get('/appointments/:id', appointmentController.getAppointmentById);

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update an existing appointment (reschedule, add notes, etc.)
 * @access  Public
 * @body    { scheduledAt, duration, engineerId, notes, status }
 */
router.put('/appointments/:id', appointmentController.updateAppointment);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel an appointment
 * @access  Public
 */
router.delete('/appointments/:id', appointmentController.cancelAppointment);

/* ===========================================
   JOB TICKET ROUTES
   For engineers to manage work orders
   =========================================== */

/**
 * @route   POST /api/job-tickets
 * @desc    Create a new job ticket (typically auto-created from appointment)
 * @access  Internal/Admin
 * @body    { appointmentId, engineerId, description }
 */
router.post('/job-tickets', jobTicketController.createJobTicket);

/**
 * @route   GET /api/job-tickets
 * @desc    Get all job tickets with filters
 * @access  Engineers/Admin
 * @query   engineerId, status, appointmentId
 */
router.get('/job-tickets', jobTicketController.getAllJobTickets);

/**
 * @route   GET /api/job-tickets/pending-parts
 * @desc    Get jobs that have requested spare parts (for inventory team)
 * @access  Inventory/Admin
 */
router.get('/job-tickets/pending-parts', jobTicketController.getJobsWithPendingParts);

/**
 * @route   GET /api/job-tickets/:id
 * @desc    Get a single job ticket with full details
 * @access  Engineers/Admin
 */
router.get('/job-tickets/:id', jobTicketController.getJobTicketById);

/**
 * @route   PATCH /api/job-tickets/:id/status
 * @desc    Update job ticket status (PENDING -> IN_PROGRESS -> COMPLETED)
 * @access  Engineers
 * @body    { status }
 */
router.patch('/job-tickets/:id/status', jobTicketController.updateJobStatus);

/**
 * @route   POST /api/job-tickets/:id/parts
 * @desc    Request spare parts for a job
 * @access  Engineers
 * @body    { parts: ["part1", "part2"] }
 */
router.post('/job-tickets/:id/parts', jobTicketController.requestSpareParts);

/**
 * @route   DELETE /api/job-tickets/:id/parts
 * @desc    Remove a spare part from request
 * @access  Engineers
 * @body    { partName }
 */
router.delete('/job-tickets/:id/parts', jobTicketController.removeSparePart);

/* ===========================================
   TELEMETRY ROUTES
   For IoT devices to send event data
   =========================================== */

/**
 * @route   POST /api/telemetry
 * @desc    Receive telemetry data from IoT security devices
 * @access  Devices (would use API key auth in production)
 * @body    Single: { deviceId, eventType, payload, timestamp?, severity? }
 *          Batch:  [{...}, {...}]
 * 
 * Example payload:
 * {
 *   "deviceId": "CAM-001-SERIAL",
 *   "eventType": "MOTION_DETECTED",
 *   "timestamp": "2024-01-15T10:30:00Z",
 *   "payload": {
 *     "zone": "front-door",
 *     "confidence": 0.95,
 *     "imageUrl": "https://..."
 *   }
 * }
 */
router.post('/telemetry', telemetryController.receiveTelemetry);

/**
 * @route   GET /api/telemetry
 * @desc    Get telemetry logs with filters (for monitoring dashboard)
 * @access  Admin/Monitoring
 * @query   deviceId, eventType, severity, startDate, endDate, processed, limit, offset
 */
router.get('/telemetry', telemetryController.getTelemetryLogs);

/**
 * @route   GET /api/telemetry/unprocessed
 * @desc    Get unprocessed logs (for background job processing)
 * @access  Internal/Background Jobs
 * @query   limit
 */
router.get('/telemetry/unprocessed', telemetryController.getUnprocessedLogs);

/**
 * @route   GET /api/telemetry/summary
 * @desc    Get telemetry statistics for dashboards
 * @access  Admin/Dashboard
 * @query   startDate, endDate
 */
router.get('/telemetry/summary', telemetryController.getTelemetrySummary);

/**
 * @route   POST /api/telemetry/mark-processed
 * @desc    Mark logs as processed after handling
 * @access  Internal/Background Jobs
 * @body    { logIds: ["id1", "id2"] }
 */
router.post('/telemetry/mark-processed', telemetryController.markAsProcessed);

/**
 * @route   POST /api/telemetry/:logId/link
 * @desc    Link a telemetry log to a job ticket (for incident tracking)
 * @access  Admin/Engineers
 * @body    { jobTicketId }
 */
router.post('/telemetry/:logId/link', telemetryController.linkToJobTicket);

/* ===========================================
   HEALTH CHECK
   =========================================== */

/**
 * @route   GET /api/health
 * @desc    API health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Berimbolo Security API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      appointments: '/api/appointments',
      jobTickets: '/api/job-tickets',
      telemetry: '/api/telemetry'
    }
  });
});

module.exports = router;
