const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routesRouter = require('./routes/routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Endpoint pengecekan kesehatan layanan
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Layanan berjalan dengan baik
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 service:
 *                   type: string
 *                   example: RouteService
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'RouteService',
    pesan: 'Layanan berjalan dengan baik',
    timestamp: new Date().toISOString()
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dokumentasi API RouteService'
}));

// API Routes
app.use('/api/routes', routesRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    pesan: 'RouteService API - TransTrack Microservice',
    message: 'API untuk mengelola data master rute dan halte',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Tidak Ditemukan',
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Kesalahan:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Kesalahan server internal',
    message: err.message || 'Terjadi kesalahan pada server'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`RouteService berjalan pada port ${PORT}`);
  console.log(`Dokumentasi API tersedia di http://localhost:${PORT}/api-docs`);
  console.log(`Health check tersedia di http://localhost:${PORT}/health`);
});

module.exports = app;

