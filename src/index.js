/**
 * Berimbolo Security - Main Application Entry Point
 * Express server with Prisma ORM for PostgreSQL
 */

const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Berimbolo Security API',
    version: '1.0.0',
    description: 'Security management system for appointments, job tickets, and IoT telemetry',
    documentation: '/api/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Berimbolo Security API Server                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                            
║  Environment: ${process.env.NODE_ENV || 'development'}                        
║                                                           ║
║  Available Endpoints:                                     ║
║  • POST   /api/appointments        - Create appointment   ║
║  • GET    /api/appointments        - List appointments    ║
║  • PUT    /api/appointments/:id    - Update appointment   ║
║  • DELETE /api/appointments/:id    - Cancel appointment   ║
║                                                           ║
║  • POST   /api/job-tickets         - Create job ticket    ║
║  • PATCH  /api/job-tickets/:id/status - Update status     ║
║  • POST   /api/job-tickets/:id/parts - Request parts      ║
║                                                           ║
║  • POST   /api/telemetry           - Receive IoT events   ║
║  • GET    /api/telemetry           - Query telemetry logs ║
║  • GET    /api/telemetry/summary   - Get statistics       ║
║                                                           ║
║  Database: PostgreSQL (via Prisma ORM)                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
