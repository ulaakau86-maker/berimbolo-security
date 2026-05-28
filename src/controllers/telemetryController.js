const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Telemetry Controller
 * Handles incoming data from IoT security devices (CCTV, Alarms, Sensors)
 * Logs events to the database for monitoring and alerting
 * Ensures data integrity through validation and proper severity classification
 */

// Mapping of event types to default severity levels
// This helps in prioritizing alerts and responses
const EVENT_SEVERITY_MAP = {
  // Critical/Emergency events requiring immediate attention
  'ALARM_TRIGGERED': 'EMERGENCY',
  'PANIC_BUTTON_PRESSED': 'EMERGENCY',
  'GLASS_BREAK_DETECTED': 'EMERGENCY',
  'FORCED_ENTRY_DETECTED': 'EMERGENCY',
  
  // Warning events that need investigation
  'MOTION_DETECTED': 'WARNING',
  'DOOR_OPENED': 'WARNING',
  'DOOR_HELD_OPEN': 'WARNING',
  'LOW_BATTERY': 'WARNING',
  'SIGNAL_LOST': 'WARNING',
  'TAMPER_DETECTED': 'WARNING',
  
  // Info events for logging and audit
  'DEVICE_ONLINE': 'INFO',
  'DEVICE_OFFLINE': 'INFO',
  'SYSTEM_ARMED': 'INFO',
  'SYSTEM_DISARMED': 'INFO',
  'MOTION_RECORDING_STARTED': 'INFO',
  'MOTION_RECORDING_STOPPED': 'INFO',
  'CONFIGURATION_CHANGED': 'INFO'
};

/**
 * Determine severity level for an event
 * Uses predefined mapping or defaults to INFO
 * @param {string} eventType - The type of event from the device
 * @returns {string} - Severity level (INFO, WARNING, CRITICAL, EMERGENCY)
 */
const getSeverityForEvent = (eventType) => {
  return EVENT_SEVERITY_MAP[eventType] || 'INFO';
};

/**
 * Validate incoming telemetry payload
 * Ensures required fields are present and properly formatted
 * @param {Object} payload - The telemetry data from the device
 * @returns {Object} - Validation result with success flag and error message if any
 */
const validateTelemetryPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be a valid JSON object' };
  }

  if (!payload.deviceId || typeof payload.deviceId !== 'string') {
    return { valid: false, error: 'deviceId is required and must be a string' };
  }

  if (!payload.eventType || typeof payload.eventType !== 'string') {
    return { valid: false, error: 'eventType is required and must be a string' };
  }

  // Optional but recommended fields validation
  if (payload.timestamp) {
    const timestamp = new Date(payload.timestamp);
    if (isNaN(timestamp.getTime())) {
      return { valid: false, error: 'Invalid timestamp format. Use ISO 8601 format' };
    }
  }

  return { valid: true };
};

/**
 * Receive telemetry data from IoT devices
 * Main endpoint for devices to send events
 * Accepts single or batch events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const receiveTelemetry = async (req, res) => {
  try {
    let payloads = req.body;

    // Support both single object and array of events
    if (!Array.isArray(payloads)) {
      payloads = [payloads];
    }

    if (payloads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No telemetry data provided'
      });
    }

    const results = {
      accepted: 0,
      rejected: 0,
      errors: []
    };

    const logsToCreate = [];

    // Process each telemetry payload
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const index = payloads.length > 1 ? `[${i}]` : '';

      // Validate payload structure
      const validation = validateTelemetryPayload(payload);
      if (!validation.valid) {
        results.rejected++;
        results.errors.push({
          index: i,
          deviceId: payload.deviceId || 'unknown',
          error: validation.error
        });
        continue;
      }

      // Verify device exists in the system
      const device = await prisma.iotDevice.findUnique({
        where: { serialNumber: payload.deviceId },
        include: { customer: true }
      });

      if (!device) {
        results.rejected++;
        results.errors.push({
          index: i,
          deviceId: payload.deviceId,
          error: 'Device not registered in the system'
        });
        continue;
      }

      // Check if device is active
      if (!device.isActive) {
        results.rejected++;
        results.errors.push({
          index: i,
          deviceId: payload.deviceId,
          error: 'Device is not active'
        });
        continue;
      }

      // Determine severity based on event type
      const severity = payload.severity || getSeverityForEvent(payload.eventType);

      // Prepare log entry
      logsToCreate.push({
        deviceId: device.id,
        eventType: payload.eventType,
        payload: payload, // Store full payload as JSON
        severity: severity,
        processed: false,
        createdAt: payload.timestamp ? new Date(payload.timestamp) : new Date()
      });

      results.accepted++;
    }

    // Bulk insert all valid telemetry logs
    // Using createMany for better performance with batch inserts
    if (logsToCreate.length > 0) {
      await prisma.telemetryLog.createMany({
        data: logsToCreate
      });
    }

    // Handle critical events - trigger immediate actions
    const criticalEvents = logsToCreate.filter(log => 
      ['CRITICAL', 'EMERGENCY'].includes(log.severity)
    );

    if (criticalEvents.length > 0) {
      // In a real system, this would trigger:
      // - Push notifications to customers
      // - Alerts to monitoring center
      // - Automatic police dispatch for emergencies
      console.log(`🚨 CRITICAL: ${criticalEvents.length} emergency event(s) require immediate attention`);
      
      // Log details for monitoring
      criticalEvents.forEach(event => {
        console.log(`  - ${event.eventType} from device ${event.deviceId}`);
      });
    }

    // Build response
    const response = {
      success: results.rejected === 0,
      message: `Processed ${payloads.length} telemetry event(s)`,
      results: {
        accepted: results.accepted,
        rejected: results.rejected
      }
    };

    if (results.errors.length > 0) {
      response.errors = results.errors;
    }

    const statusCode = results.accepted > 0 && results.rejected === 0 ? 200 :
                       results.accepted > 0 && results.rejected > 0 ? 207 : 400;

    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Error processing telemetry:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing telemetry data'
    });
  }
};

/**
 * Get telemetry logs with filters
 * For monitoring dashboards and incident investigation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTelemetryLogs = async (req, res) => {
  try {
    const { 
      deviceId, 
      eventType, 
      severity, 
      startDate, 
      endDate, 
      processed,
      limit = 100,
      offset = 0 
    } = req.query;

    const where = {};

    if (deviceId) {
      // Support lookup by serial number or internal ID
      const device = await prisma.iotDevice.findUnique({
        where: { serialNumber: deviceId }
      });
      if (device) {
        where.deviceId = device.id;
      } else {
        where.deviceId = deviceId;
      }
    }

    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (processed !== undefined) {
      where.processed = processed === 'true';
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.telemetryLog.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            serialNumber: true,
            deviceType: true,
            modelName: true,
            location: true
          }
        },
        jobTicket: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 1000), // Cap at 1000 for performance
      skip: parseInt(offset)
    });

    // Get total count for pagination
    const totalCount = await prisma.telemetryLog.count({ where });

    res.json({
      success: true,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount
      },
      data: logs
    });

  } catch (error) {
    console.error('Error fetching telemetry logs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching telemetry logs'
    });
  }
};

/**
 * Get unprocessed telemetry logs
 * For background jobs that process and act on events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUnprocessedLogs = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await prisma.telemetryLog.findMany({
      where: {
        processed: false
      },
      include: {
        device: {
          select: {
            serialNumber: true,
            deviceType: true,
            customer: {
              select: {
                fullName: true,
                phone: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }, // Process oldest first
      take: Math.min(parseInt(limit), 500)
    });

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });

  } catch (error) {
    console.error('Error fetching unprocessed logs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching unprocessed logs'
    });
  }
};

/**
 * Mark telemetry logs as processed
 * Called after actions have been taken on events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsProcessed = async (req, res) => {
  try {
    const { logIds } = req.body;

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'logIds must be a non-empty array'
      });
    }

    const result = await prisma.telemetryLog.updateMany({
      where: {
        id: { in: logIds }
      },
      data: {
        processed: true
      }
    });

    res.json({
      success: true,
      message: `Marked ${result.count} log(s) as processed`,
      count: result.count
    });

  } catch (error) {
    console.error('Error marking logs as processed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while marking logs as processed'
    });
  }
};

/**
 * Get telemetry summary statistics
 * For dashboards and reporting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTelemetrySummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get counts by severity
    const severityCounts = await prisma.telemetryLog.groupBy({
      by: ['severity'],
      where,
      _count: true
    });

    // Get counts by event type
    const eventTypeCounts = await prisma.telemetryLog.groupBy({
      by: ['eventType'],
      where,
      _count: true,
      orderBy: {
        _count: {
          eventType: 'desc'
        }
      },
      take: 20 // Top 20 event types
    });

    // Get critical events count
    const criticalCount = await prisma.telemetryLog.count({
      where: {
        ...where,
        severity: { in: ['CRITICAL', 'EMERGENCY'] }
      }
    });

    // Get unprocessed count
    const unprocessedCount = await prisma.telemetryLog.count({
      where: {
        ...where,
        processed: false
      }
    });

    res.json({
      success: true,
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'present'
      },
      summary: {
        totalEvents: severityCounts.reduce((sum, s) => sum + s._count, 0),
        bySeverity: severityCounts.reduce((acc, s) => {
          acc[s.severity] = s._count;
          return acc;
        }, {}),
        topEventTypes: eventTypeCounts.map(e => ({
          eventType: e.eventType,
          count: e._count
        })),
        criticalEvents: criticalCount,
        unprocessedEvents: unprocessedCount
      }
    });

  } catch (error) {
    console.error('Error fetching telemetry summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching telemetry summary'
    });
  }
};

/**
 * Link telemetry log to a job ticket
 * Associates device events with ongoing maintenance work
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const linkToJobTicket = async (req, res) => {
  try {
    const { logId } = req.params;
    const { jobTicketId } = req.body;

    if (!jobTicketId) {
      return res.status(400).json({
        success: false,
        error: 'jobTicketId is required'
      });
    }

    // Verify log exists
    const log = await prisma.telemetryLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Telemetry log not found'
      });
    }

    // Verify job ticket exists
    const jobTicket = await prisma.jobTicket.findUnique({
      where: { id: jobTicketId }
    });

    if (!jobTicket) {
      return res.status(404).json({
        success: false,
        error: 'Job ticket not found'
      });
    }

    // Update the log with job ticket reference
    const updatedLog = await prisma.telemetryLog.update({
      where: { id: logId },
      data: { jobTicketId },
      include: {
        device: true,
        jobTicket: true
      }
    });

    res.json({
      success: true,
      message: 'Telemetry log linked to job ticket',
      data: updatedLog
    });

  } catch (error) {
    console.error('Error linking log to job ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while linking log to job ticket'
    });
  }
};

module.exports = {
  receiveTelemetry,
  getTelemetryLogs,
  getUnprocessedLogs,
  markAsProcessed,
  getTelemetrySummary,
  linkToJobTicket,
  validateTelemetryPayload,
  getSeverityForEvent,
  EVENT_SEVERITY_MAP
};
