const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const gatewayRouter = require('./routes/gateway');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Gateway service is healthy
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'GatewayService',
    message: 'API Gateway berjalan dengan baik',
    timestamp: new Date().toISOString(),
    services: {
      route: process.env.ROUTE_SERVICE_URL || 'http://localhost:3000',
      driver: process.env.DRIVER_SERVICE_URL || 'http://localhost:3001',
      user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      maintenance: process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:3003',
      ticket: process.env.TICKET_SERVICE_URL || 'http://localhost:3004',
      schedule: process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3005',
      bus: process.env.BUS_SERVICE_URL || 'http://localhost:3006',
    },
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dokumentasi API Gateway - TransTrack',
}));

// API Gateway Routes
app.use('/api', gatewayRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway - TransTrack',
    description: 'Single entry point untuk semua service TransTrack',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      routes: '/api/routes',
      drivers: '/api/drivers',
      users: '/api/users',
      maintenance: '/api/maintenance',
      tickets: '/api/tickets',
      schedules: '/api/schedules',
      buses: '/api/buses',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    message: err.message || 'Terjadi kesalahan pada server',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`GatewayService berjalan pada port ${PORT}`);
  console.log(`Dokumentasi API tersedia di http://localhost:${PORT}/api-docs`);
  console.log(`Health check tersedia di http://localhost:${PORT}/health`);
  console.log(`\nService URLs:`);
  console.log(`  RouteService: ${process.env.ROUTE_SERVICE_URL || 'http://localhost:3000'}`);
  console.log(`  DriverService: ${process.env.DRIVER_SERVICE_URL || 'http://localhost:3001'}`);
  console.log(`  UserService: ${process.env.USER_SERVICE_URL || 'http://localhost:3002'}`);
  console.log(`  MaintenanceService: ${process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:3003'}`);
  console.log(`  TicketService: ${process.env.TICKET_SERVICE_URL || 'http://localhost:3004'}`);
  console.log(`  ScheduleService: ${process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3005'}`);
  console.log(`  BusService: ${process.env.BUS_SERVICE_URL || 'http://localhost:3006'}`);
});

module.exports = app;
