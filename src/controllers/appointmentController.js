const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Appointment Controller
 * Handles CRUD operations for appointments
 * Ensures data integrity by validating engineer availability before booking
 */

/**
 * Validate if an engineer is available at a specific time slot
 * Checks for overlapping appointments within the requested duration
 * @param {string} engineerId - The engineer's UUID
 * @param {Date} scheduledAt - The requested appointment start time
 * @param {number} duration - Duration in minutes
 * @param {string|null} excludeAppointmentId - Exclude this appointment ID when checking (for updates)
 * @returns {Promise<boolean>} - True if available, false if busy
 */
const checkEngineerAvailability = async (engineerId, scheduledAt, duration, excludeAppointmentId = null) => {
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + duration * 60000); // Convert minutes to ms

  // Find any overlapping appointments for this engineer
  // An overlap exists if: existing.start < new.end AND existing.end > new.start
  const overlappingAppointments = await prisma.appointment.findMany({
    where: {
      engineerId: engineerId,
      status: {
        not: 'CANCELLED' // Only check non-cancelled appointments
      },
      ...(excludeAppointmentId && {
        id: { not: excludeAppointmentId } // Exclude current appointment when updating
      }),
      OR: [
        {
          // Existing appointment starts before new end time AND ends after new start time
          scheduledAt: {
            lt: endTime
          },
          // Calculate end time of existing appointment and check overlap
        }
      ]
    }
  });

  // Manual check for overlap since Prisma doesn't support calculated fields in WHERE
  for (const apt of overlappingAppointments) {
    const existingStart = apt.scheduledAt;
    const existingEnd = new Date(existingStart.getTime() + apt.duration * 60000);
    
    // Check if there's an overlap
    if (startTime < existingEnd && endTime > existingStart) {
      return false; // Engineer is not available
    }
  }

  return true; // Engineer is available
};

/**
 * Create a new appointment
 * Validates engineer availability before creating
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAppointment = async (req, res) => {
  try {
    const { customerId, engineerId, scheduledAt, duration, notes } = req.body;

    // Input validation
    if (!customerId || !engineerId || !scheduledAt || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, engineerId, scheduledAt, and duration are required'
      });
    }

    if (typeof duration !== 'number' || duration <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be a positive number (in minutes)'
      });
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Verify engineer exists and is active
    const engineer = await prisma.engineer.findUnique({
      where: { id: engineerId }
    });

    if (!engineer) {
      return res.status(404).json({
        success: false,
        error: 'Engineer not found'
      });
    }

    if (!engineer.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Selected engineer is not currently active'
      });
    }

    // Check engineer availability (CRITICAL FOR DATA INTEGRITY)
    // This prevents double-booking and ensures service quality
    const isAvailable = await checkEngineerAvailability(engineerId, scheduledAt, duration);
    
    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        error: 'Engineer is not available at the requested time. Please choose another time slot.'
      });
    }

    // Validate scheduledAt is not in the past
    if (new Date(scheduledAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot schedule appointments in the past'
      });
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        customerId,
        engineerId,
        scheduledAt: new Date(scheduledAt),
        duration,
        notes: notes || null,
        status: 'SCHEDULED'
      },
      include: {
        customer: true,
        engineer: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating appointment'
    });
  }
};

/**
 * Get all appointments with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllAppointments = async (req, res) => {
  try {
    const { customerId, engineerId, status, startDate, endDate } = req.query;

    const where = {};

    if (customerId) where.customerId = customerId;
    if (engineerId) where.engineerId = engineerId;
    if (status) where.status = status;
    
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        engineer: { select: { id: true, fullName: true, email: true, specialty: true } },
        jobTicket: true
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching appointments'
    });
  }
};

/**
 * Get a single appointment by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        engineer: true,
        jobTicket: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching appointment'
    });
  }
};

/**
 * Update an existing appointment
 * Validates engineer availability if time/engineer changes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, duration, engineerId, notes, status } = req.body;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Cannot modify cancelled appointments
    if (existingAppointment.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify a cancelled appointment'
      });
    }

    // Build update data
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    // If changing time or engineer, validate availability
    const newScheduledAt = scheduledAt || existingAppointment.scheduledAt;
    const newDuration = duration || existingAppointment.duration;
    const newEngineerId = engineerId || existingAppointment.engineerId;

    const timeOrEngineerChanged = 
      (scheduledAt && scheduledAt !== existingAppointment.scheduledAt.toISOString()) ||
      (duration && duration !== existingAppointment.duration) ||
      (engineerId && engineerId !== existingAppointment.engineerId);

    if (timeOrEngineerChanged) {
      // Verify new engineer exists and is active
      if (engineerId) {
        const engineer = await prisma.engineer.findUnique({
          where: { id: engineerId }
        });

        if (!engineer) {
          return res.status(404).json({
            success: false,
            error: 'New engineer not found'
          });
        }

        if (!engineer.isActive) {
          return res.status(400).json({
            success: false,
            error: 'New engineer is not currently active'
          });
        }
      }

      // Check availability for the new time slot
      const isAvailable = await checkEngineerAvailability(
        newEngineerId, 
        newScheduledAt, 
        newDuration, 
        id // Exclude current appointment from availability check
      );

      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          error: 'Engineer is not available at the requested time. Please choose another time slot.'
        });
      }

      updateData.scheduledAt = new Date(newScheduledAt);
      updateData.duration = newDuration;
      updateData.engineerId = newEngineerId;
      
      // If rescheduling, update status
      if (scheduledAt || engineerId) {
        updateData.status = 'RESCHEDULED';
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        engineer: true
      }
    });

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });

  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating appointment'
    });
  }
};

/**
 * Cancel an appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'Appointment is already cancelled'
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        engineer: true
      }
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: updatedAppointment
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while cancelling appointment'
    });
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  checkEngineerAvailability
};
