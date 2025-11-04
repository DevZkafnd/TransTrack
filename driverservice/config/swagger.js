const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DriverService API',
      version: '1.0.0',
      description: 'API Provider untuk mengelola data master pengemudi pada TransTrack microservice architecture',
      contact: {
        name: 'TransTrack API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Server pengembangan',
      },
      {
        url: 'https://api.transtrack.com',
        description: 'Server produksi',
      },
    ],
    components: {
      schemas: {
        Driver: {
          type: 'object',
          required: ['name', 'license'],
          properties: {
            id: {
              type: 'string',
              description: 'ID pengemudi yang dibuat otomatis oleh database',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Nama pengemudi',
              example: 'Budi Santoso',
            },
            license: {
              type: 'string',
              description: 'Nomor lisensi pengemudi',
              example: 'SIM-A-1234567890',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembuatan data pengemudi',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembaruan terakhir data pengemudi',
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
              example: 'Pengemudi tidak ditemukan',
            },
            message: {
              type: 'string',
              description: 'Detail kesalahan',
              example: 'Pengemudi dengan ID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operasi berhasil diselesaikan',
            },
            data: {
              type: 'object',
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './server.js'], // Path ke file yang berisi dokumentasi Swagger
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

