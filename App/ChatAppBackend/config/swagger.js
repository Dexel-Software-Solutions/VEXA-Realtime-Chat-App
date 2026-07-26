/**
 * config/swagger.js
 * OpenAPI 3.0 Interactive API Documentation Specification.
 */

const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ChatApp Enterprise Real-Time API Specification',
    version: '2.0.0',
    description:
      'Production REST API & WebSocket service for cross-platform real-time mobile chat. Features JWT Authentication, Rate Limiting, Socket.io presence, and AI Smart Assistant.',
    contact: {
      name: 'ChatApp Engineering Architecture Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System Health & Metrics Gauge',
        tags: ['Observability'],
        responses: {
          200: { description: 'System health metrics returned.' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register new user account',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Account registered successfully.' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User Authentication & JWT Token Grant',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Login successful.' } },
      },
    },
    '/chats': {
      get: {
        summary: 'Fetch user active conversations',
        tags: ['Chats'],
        responses: { 200: { description: 'Chat list retrieved.' } },
      },
    },
    '/messages/{chatId}': {
      get: {
        summary: 'Fetch chat messages with cursor pagination',
        tags: ['Messages'],
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 30 } },
          { name: 'beforeId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Messages list retrieved.' } },
      },
    },
  },
};

module.exports = { swaggerUi, swaggerDocument };
