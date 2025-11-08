const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BusService API',
      version: '1.0.0',
      description: 'API Provider untuk mengelola data master armada bus pada TransTrack microservice architecture',
      contact: {
        name: 'TransTrack API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3006}`,
        description: 'Server pengembangan',
      },
      {
        url: 'https://api.transtrack.com',
        description: 'Server produksi',
      },
    ],
    components: {
      schemas: {
        Bus: {
          type: 'object',
          required: ['plate', 'capacity', 'model'],
          properties: {
            id: {
              type: 'string',
              description: 'ID bus yang dibuat otomatis oleh database',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            plate: {
              type: 'string',
              description: 'Nomor plat bus',
              example: 'B 1234 CD',
            },
            capacity: {
              type: 'integer',
              description: 'Kapasitas penumpang bus',
              example: 40,
            },
            model: {
              type: 'string',
              description: 'Model bus',
              example: 'Mercedes-Benz Tourismo',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembuatan data bus',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembaruan terakhir data bus',
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
              example: 'Bus tidak ditemukan',
            },
            message: {
              type: 'string',
              description: 'Detail kesalahan',
              example: 'Bus dengan ID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
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

