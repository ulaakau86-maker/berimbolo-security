# Berimbolo Security API

Backend API for the Berimbolo Security web application built with Node.js, Express, and Prisma (PostgreSQL).

## Features

- **Appointment Management**: Customers can book, reschedule, and cancel service appointments
- **Job Ticket System**: Engineers can update job status and request spare parts
- **IoT Telemetry**: Receive and log events from security devices (CCTV, alarms, sensors)
- **Data Integrity**: Built-in validation for engineer availability, status transitions, and device authentication

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL

## Project Structure

```
/workspace
├── prisma/
│   └── schema.prisma          # Database schema and models
├── src/
│   ├── controllers/
│   │   ├── appointmentController.js  # Appointment CRUD + availability checks
│   │   ├── jobTicketController.js    # Job status & spare parts management
│   │   └── telemetryController.js    # IoT device event handling
│   ├── routes.js              # API route definitions
│   └── index.js               # Application entry point
├── package.json
└── README.md
```

## Database Schema

### Models

1. **Customer** - Clients who own security devices
2. **Engineer** - Technical staff performing installations/maintenance
3. **Appointment** - Scheduled service visits
4. **JobTicket** - Work orders assigned to engineers
5. **IoTDevice** - CCTV cameras, alarm systems, sensors
6. **TelemetryLog** - Event logs from IoT devices

### Relationships

- Customer → Many Appointments
- Customer → Many IoTDevices
- Engineer → Many Appointments
- Engineer → Many JobTickets
- Appointment → One JobTicket (optional)
- IoTDevice → Many TelemetryLogs
- JobTicket → Many TelemetryLogs (optional)

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed sample data
npm run db:seed
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/berimbolo_security?schema=public"
PORT=3000
NODE_ENV=development
```

## API Endpoints

### Appointments (`/api/appointments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new appointment |
| GET | `/` | List all appointments (filterable) |
| GET | `/:id` | Get appointment by ID |
| PUT | `/:id` | Update/reschedule appointment |
| DELETE | `/:id` | Cancel appointment |

**Example - Create Appointment:**
```json
POST /api/appointments
{
  "customerId": "uuid",
  "engineerId": "uuid",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "duration": 60,
  "notes": "Install new CCTV system"
}
```

### Job Tickets (`/api/job-tickets`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create job ticket |
| GET | `/` | List job tickets |
| GET | `/pending-parts` | Jobs needing spare parts |
| GET | `/:id` | Get job ticket details |
| PATCH | `/:id/status` | Update job status |
| POST | `/:id/parts` | Request spare parts |
| DELETE | `/:id/parts` | Remove part request |

**Valid Status Transitions:**
- PENDING → IN_PROGRESS, CANCELLED
- IN_PROGRESS → COMPLETED, ON_HOLD, CANCELLED
- ON_HOLD → IN_PROGRESS, CANCELLED
- COMPLETED → (terminal)
- CANCELLED → (terminal)

**Example - Update Status:**
```json
PATCH /api/job-tickets/{id}/status
{
  "status": "IN_PROGRESS"
}
```

**Example - Request Parts:**
```json
POST /api/job-tickets/{id}/parts
{
  "parts": ["Camera Mount XYZ", "Ethernet Cable 10m"]
}
```

### Telemetry (`/api/telemetry`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Receive device events |
| GET | `/` | Query telemetry logs |
| GET | `/unprocessed` | Get unprocessed events |
| GET | `/summary` | Get statistics |
| POST | `/mark-processed` | Mark logs processed |
| POST | `/:logId/link` | Link to job ticket |

**Example - Device Telemetry:**
```json
POST /api/telemetry
{
  "deviceId": "CAM-001-SERIAL",
  "eventType": "MOTION_DETECTED",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "zone": "front-door",
    "confidence": 0.95,
    "imageUrl": "https://storage.example.com/capture.jpg"
  }
}
```

**Batch Events:**
```json
POST /api/telemetry
[
  { "deviceId": "CAM-001", "eventType": "MOTION_DETECTED", ... },
  { "deviceId": "ALARM-002", "eventType": "SYSTEM_ARMED", ... }
]
```

## Data Integrity Features

### 1. Engineer Availability Checking
Before creating or rescheduling appointments, the system:
- Checks for overlapping time slots
- Excludes cancelled appointments from conflicts
- Validates engineer is active
- Prevents double-booking

### 2. Job Status Workflow Enforcement
Status transitions are validated to prevent invalid workflows:
- Cannot skip from PENDING directly to COMPLETED
- Cannot modify completed/cancelled jobs
- Automatic timestamp tracking for completion

### 3. Telemetry Validation
Incoming device data is validated for:
- Required fields (deviceId, eventType)
- Device registration in system
- Device active status
- Proper timestamp format
- Automatic severity classification

### 4. Referential Integrity
Prisma schema enforces:
- Cascade deletes for related records
- Unique constraints (email, serial numbers)
- Foreign key relationships
- Required field validation

## Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `207` - Multi-status (partial success for batch operations)
- `400` - Bad request (validation failed)
- `404` - Not found
- `409` - Conflict (e.g., engineer not available)
- `500` - Internal server error

## Security Considerations

For production deployment, implement:

1. **Authentication**: JWT or session-based auth for API endpoints
2. **API Keys**: Device authentication for telemetry endpoints
3. **Rate Limiting**: Prevent abuse of public endpoints
4. **Input Sanitization**: Additional validation for user inputs
5. **HTTPS**: Encrypt all traffic
6. **Environment Variables**: Never commit secrets to version control

## License

ISC
