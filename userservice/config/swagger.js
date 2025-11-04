const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UserService API',
      version: '1.0.0',
      description: 'API Provider untuk mengelola data master pengguna/penumpang pada TransTrack microservice architecture',
      contact: {
        name: 'TransTrack API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Server pengembangan (Port 3001)',
      },
      {
        url: 'http://localhost:3002',
        description: 'Server pengembangan (Port 3002)',
      },
      {
        url: 'https://api.transtrack.com',
        description: 'Server produksi',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'phone', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'ID pengguna yang dibuat otomatis oleh database',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Nama lengkap pengguna',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email pengguna (unique)',
              example: 'john.doe@example.com',
            },
            phone: {
              type: 'string',
              description: 'Nomor telepon pengguna (unique)',
              example: '+6281234567890',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password pengguna (disimpan dalam bentuk hash)',
              writeOnly: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembuatan data pengguna',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembaruan terakhir data pengguna',
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
              example: 'Pengguna tidak ditemukan',
            },
            message: {
              type: 'string',
              description: 'Detail kesalahan',
              example: 'Pengguna dengan ID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
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

