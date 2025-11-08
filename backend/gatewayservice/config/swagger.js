const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gateway - TransTrack',
      version: '1.0.0',
      description: 'API Gateway sebagai entry point tunggal untuk semua service TransTrack',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js', './server.js'],
};

module.exports = swaggerJsdoc(options);
