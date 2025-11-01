const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RouteService API',
      version: '1.0.0',
      description: 'API Provider untuk mengelola data master rute dan halte pada TransTrack microservice architecture',
      contact: {
        name: 'TransTrack API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Server pengembangan',
      },
      {
        url: 'https://api.transtrack.com',
        description: 'Server produksi',
      },
    ],
    components: {
      schemas: {
        Route: {
          type: 'object',
          required: ['routeName', 'routeCode', 'stops'],
          properties: {
            id: {
              type: 'string',
              description: 'ID rute yang dibuat otomatis oleh Firestore',
              example: 'route_abc123',
            },
            routeName: {
              type: 'string',
              description: 'Nama rute',
              example: 'Rute A - Terminal Kota ke Terminal Bandara',
            },
            routeCode: {
              type: 'string',
              description: 'Kode unik rute',
              example: 'RT-001',
            },
            description: {
              type: 'string',
              description: 'Deskripsi rute',
              example: 'Rute utama menghubungkan terminal kota dengan bandara',
            },
            stops: {
              type: 'array',
              description: 'Daftar halte dalam rute',
              items: {
                $ref: '#/components/schemas/Stop',
              },
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance'],
              description: 'Status rute',
              example: 'active',
              default: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembuatan rute',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp pembaruan terakhir rute',
            },
          },
        },
        Stop: {
          type: 'object',
          required: ['stopName', 'stopCode', 'latitude', 'longitude'],
          properties: {
            stopName: {
              type: 'string',
              description: 'Nama halte',
              example: 'Halte Terminal Kota',
            },
            stopCode: {
              type: 'string',
              description: 'Kode unik halte',
              example: 'STP-001',
            },
            latitude: {
              type: 'number',
              format: 'double',
              description: 'Koordinat latitude halte',
              example: -6.2088,
            },
            longitude: {
              type: 'number',
              format: 'double',
              description: 'Koordinat longitude halte',
              example: 106.8456,
            },
            address: {
              type: 'string',
              description: 'Alamat halte',
              example: 'Jl. Terminal Kota No. 1',
            },
            sequence: {
              type: 'integer',
              description: 'Urutan halte dalam rute',
              example: 1,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Pesan kesalahan',
              example: 'Rute tidak ditemukan',
            },
            message: {
              type: 'string',
              description: 'Detail kesalahan',
              example: 'Rute dengan ID route_abc123 tidak ditemukan',
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

