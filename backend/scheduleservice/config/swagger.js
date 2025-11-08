const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ScheduleService API',
      version: '1.0.0',
      description: 'API Provider untuk mengelola data jadwal perjalanan bus pada TransTrack microservice architecture',
      contact: {
        name: 'TransTrack API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3005}`,
        description: 'Server pengembangan',
      },
      {
        url: 'https://api.transtrack.com',
        description: 'Server produksi',
      },
    ],
    components: {
      schemas: {
        Schedule: {
          type: 'object',
          required: ['routeId', 'routeName', 'busId', 'busPlate', 'driverId', 'driverName', 'time'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID jadwal yang dibuat otomatis',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            routeId: {
              type: 'string',
              description: 'ID rute',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            routeName: {
              type: 'string',
              description: 'Nama rute',
              example: 'Jakarta - Bandung',
            },
            busId: {
              type: 'string',
              description: 'ID bus',
              example: 'BUS-001',
            },
            busPlate: {
              type: 'string',
              description: 'Plat nomor bus',
              example: 'B 1234 CD',
            },
            driverId: {
              type: 'string',
              description: 'ID pengemudi',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            driverName: {
              type: 'string',
              description: 'Nama pengemudi',
              example: 'Budi Santoso',
            },
            time: {
              type: 'string',
              format: 'date-time',
              description: 'Waktu keberangkatan',
              example: '2025-11-10T09:00:00Z',
            },
            ticketId: {
              type: 'string',
              description: 'ID tiket terkait (opsional)',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembuatan jadwal',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembaruan terakhir jadwal',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Pesan kesalahan',
              example: 'Jadwal tidak ditemukan',
            },
            message: {
              type: 'string',
              description: 'Detail kesalahan',
              example: 'Jadwal dengan ID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

