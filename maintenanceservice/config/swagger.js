const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MaintenanceService API',
      version: '1.0.0',
      description: 'API Provider untuk mengelola data master riwayat dan jadwal perbaikan bus pada TransTrack microservice architecture',
      contact: {
        name: 'TransTrack API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3003',
        description: 'Server pengembangan',
      },
      {
        url: 'https://api.transtrack.com',
        description: 'Server produksi',
      },
    ],
    components: {
      schemas: {
        Maintenance: {
          type: 'object',
          required: ['busId', 'maintenanceType', 'description', 'scheduledDate'],
          properties: {
            id: {
              type: 'string',
              description: 'ID maintenance yang dibuat otomatis oleh database',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            busId: {
              type: 'string',
              description: 'ID bus yang akan diperbaiki',
              example: 'BUS-001',
            },
            maintenanceType: {
              type: 'string',
              description: 'Jenis perbaikan',
              example: 'Routine Service',
            },
            description: {
              type: 'string',
              description: 'Deskripsi perbaikan',
              example: 'Ganti oli mesin dan filter udara',
            },
            scheduledDate: {
              type: 'string',
              format: 'date-time',
              description: 'Tanggal dan waktu jadwal perbaikan',
            },
            completedDate: {
              type: 'string',
              format: 'date-time',
              description: 'Tanggal dan waktu selesai perbaikan',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
              description: 'Status perbaikan',
              example: 'scheduled',
              default: 'scheduled',
            },
            cost: {
              type: 'number',
              format: 'double',
              description: 'Biaya perbaikan',
              example: 500000.00,
              nullable: true,
            },
            mechanicName: {
              type: 'string',
              description: 'Nama mekanik yang menangani',
              example: 'Budi Santoso',
              nullable: true,
            },
            notes: {
              type: 'string',
              description: 'Catatan tambahan',
              example: 'Perlu pengecekan rem setelah service',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembuatan data maintenance',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembaruan terakhir data maintenance',
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
              example: 'Maintenance tidak ditemukan',
            },
            message: {
              type: 'string',
              description: 'Detail kesalahan',
              example: 'Maintenance dengan ID 550e8400-e29b-41d4-a716-446655440000 tidak ditemukan',
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

