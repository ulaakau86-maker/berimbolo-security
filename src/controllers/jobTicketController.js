const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Job Ticket Controller
 * Handles CRUD operations for job tickets
 * Allows engineers to update job status and request spare parts
 * Ensures data integrity through status transitions and validation
 */

// Valid status transitions to maintain business logic
const VALID_STATUS_TRANSITIONS = {
  'PENDING': ['IN_PROGRESS', 'CANCELLED'],
  'IN_PROGRESS': ['COMPLETED', 'ON_HOLD', 'CANCELLED'],
  'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
  'COMPLETED': [], // Terminal state - no transitions allowed
  'CANCELLED': []  // Terminal state - no transitions allowed
};

/**
 * Validate status transition
 * Ensures jobs follow proper workflow (e.g., can't go from PENDING to COMPLETED directly)
 * @param {string} currentStatus - Current job ticket status
 * @param {string} newStatus - Requested new status
 * @returns {boolean} - True if transition is valid
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(newStatus);
};

/**
 * Create a job ticket
 * Typically created automatically when an appointment is confirmed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createJobTicket = async (req, res) => {
  try {
    const { appointmentId, engineerId, description } = req.body;

    // Input validation
    if (!appointmentId || !engineerId || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: appointmentId, engineerId, and description are required'
      });
    }

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { jobTicket: true }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check if job ticket already exists for this appointment
    if (appointment.jobTicket) {
      return res.status(409).json({
        success: false,
        error: 'A job ticket already exists for this appointment'
      });
    }

    // Verify engineer exists
    const engineer = await prisma.engineer.findUnique({
      where: { id: engineerId }
    });

    if (!engineer) {
      return res.status(404).json({
        success: false,
        error: 'Engineer not found'
      });
    }

    // Create the job ticket
    const jobTicket = await prisma.jobTicket.create({
      data: {
        appointmentId,
        engineerId,
        description,
        status: 'PENDING',
        sparePartsRequested: []
      },
      include: {
        appointment: {
          include: {
            customer: true,
            engineer: true
          }
        },
        engineer: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Job ticket created successfully',
      data: jobTicket
    });

  } catch (error) {
    console.error('Error creating job ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating job ticket'
    });
  }
};

/**
 * Get all job tickets with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllJobTickets = async (req, res) => {
  try {
    const { engineerId, status, appointmentId } = req.query;

    const where = {};

    if (engineerId) where.engineerId = engineerId;
    if (status) where.status = status;
    if (appointmentId) where.appointmentId = appointmentId;

    const jobTickets = await prisma.jobTicket.findMany({
      where,
      include: {
        appointment: {
          include: {
            customer: { select: { id: true, fullName: true, phone: true, address: true } }
          }
        },
        engineer: { select: { id: true, fullName: true, specialty: true } },
        telemetryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Include last 5 telemetry logs for context
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: jobTickets.length,
      data: jobTickets
    });

  } catch (error) {
    console.error('Error fetching job tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching job tickets'
    });
  }
};

/**
 * Get a single job ticket by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getJobTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const jobTicket = await prisma.jobTicket.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            customer: true,
            engineer: true
          }
        },
        engineer: true,
        telemetryLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!jobTicket) {
      return res.status(404).json({
        success: false,
        error: 'Job ticket not found'
      });
    }

    res.json({
      success: true,
      data: jobTicket
    });

  } catch (error) {
    console.error('Error fetching job ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching job ticket'
    });
  }
};

/**
 * Update job ticket status
 * Validates status transitions to maintain workflow integrity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Input validation
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Validate status value
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Get current job ticket
    const jobTicket = await prisma.jobTicket.findUnique({
      where: { id }
    });

    if (!jobTicket) {
      return res.status(404).json({
        success: false,
        error: 'Job ticket not found'
      });
    }

    // Validate status transition (BUSINESS LOGIC INTEGRITY)
    // Prevents invalid workflows like skipping from PENDING to COMPLETED
    if (!isValidStatusTransition(jobTicket.status, status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${jobTicket.status} to ${status}. Allowed transitions: ${VALID_STATUS_TRANSITIONS[jobTicket.status].join(', ') || 'none (terminal state)'}`
      });
    }

    // Build update data
    const updateData = {
      status: status
    };

    // Set completedAt timestamp when marking as COMPLETED
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedJobTicket = await prisma.jobTicket.update({
      where: { id },
      data: updateData,
      include: {
        appointment: {
          include: {
            customer: true
          }
        },
        engineer: true
      }
    });

    // If job is completed, also update the related appointment status
    if (status === 'COMPLETED') {
      await prisma.appointment.update({
        where: { id: jobTicket.appointmentId },
        data: { status: 'COMPLETED' }
      });
    }

    res.json({
      success: true,
      message: `Job ticket status updated to ${status}`,
      data: updatedJobTicket
    });

  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating job status'
    });
  }
};

/**
 * Request spare parts for a job ticket
 * Engineers can add parts needed for the job
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const requestSpareParts = async (req, res) => {
  try {
    const { id } = req.params;
    const { parts } = req.body;

    // Input validation
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Parts must be a non-empty array of part names/IDs'
      });
    }

    // Validate each part entry
    for (const part of parts) {
      if (typeof part !== 'string' || part.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Each part must be a non-empty string'
        });
      }
    }

    // Get current job ticket
    const jobTicket = await prisma.jobTicket.findUnique({
      where: { id }
    });

    if (!jobTicket) {
      return res.status(404).json({
        success: false,
        error: 'Job ticket not found'
      });
    }

    // Cannot request parts for completed or cancelled jobs
    if (['COMPLETED', 'CANCELLED'].includes(jobTicket.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot request spare parts for completed or cancelled jobs'
      });
    }

    // Append new parts to existing list (avoid duplicates)
    const existingParts = jobTicket.sparePartsRequested || [];
    const newParts = [...new Set([...existingParts, ...parts.map(p => p.trim())])];

    const updatedJobTicket = await prisma.jobTicket.update({
      where: { id },
      data: {
        sparePartsRequested: newParts
      },
      include: {
        appointment: true,
        engineer: true
      }
    });

    res.json({
      success: true,
      message: `Added ${parts.length} spare part(s) to the request`,
      data: {
        jobTicket: updatedJobTicket,
        totalPartsRequested: newParts.length,
        newlyAdded: parts.filter(p => !existingParts.includes(p.trim()))
      }
    });

  } catch (error) {
    console.error('Error requesting spare parts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while requesting spare parts'
    });
  }
};

/**
 * Remove a spare part from the request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const { partName } = req.body;

    if (!partName || typeof partName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Part name is required'
      });
    }

    const jobTicket = await prisma.jobTicket.findUnique({
      where: { id }
    });

    if (!jobTicket) {
      return res.status(404).json({
        success: false,
        error: 'Job ticket not found'
      });
    }

    const existingParts = jobTicket.sparePartsRequested || [];
    const updatedParts = existingParts.filter(p => p !== partName.trim());

    const updatedJobTicket = await prisma.jobTicket.update({
      where: { id },
      data: {
        sparePartsRequested: updatedParts
      },
      include: {
        appointment: true,
        engineer: true
      }
    });

    res.json({
      success: true,
      message: 'Spare part removed from request',
      data: updatedJobTicket
    });

  } catch (error) {
    console.error('Error removing spare part:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while removing spare part'
    });
  }
};

/**
 * Get job tickets requiring spare parts
 * Helper endpoint for inventory management
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getJobsWithPendingParts = async (req, res) => {
  try {
    const jobTickets = await prisma.jobTicket.findMany({
      where: {
        sparePartsRequested: {
          isEmpty: false // Only jobs with requested parts
        },
        status: {
          notIn: ['COMPLETED', 'CANCELLED'] // Exclude finished jobs
        }
      },
      include: {
        appointment: {
          include: {
            customer: { select: { fullName: true, phone: true } }
          }
        },
        engineer: { select: { fullName: true, phone: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      count: jobTickets.length,
      data: jobTickets
    });

  } catch (error) {
    console.error('Error fetching jobs with pending parts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching jobs with pending parts'
    });
  }
};

module.exports = {
  createJobTicket,
  getAllJobTickets,
  getJobTicketById,
  updateJobStatus,
  requestSpareParts,
  removeSparePart,
  getJobsWithPendingParts,
  isValidStatusTransition
};
