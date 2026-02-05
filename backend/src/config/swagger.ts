import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Guincoin Rewards Platform API',
      version: '1.0.1',
      description: `
API documentation for the Guincoin Rewards Platform - an employee recognition and rewards system.

## Authentication
Most endpoints require authentication via session cookies. Users authenticate through Google OAuth.

## Key Features
- **Account Management**: View balances and transaction history
- **Manager Allotments**: Managers can award coins to employees from their allotment
- **Peer Transfers**: Employees can send coins to colleagues
- **Wellness Programs**: Complete wellness tasks to earn coins
- **Store**: Redeem coins for products
- **Admin Portal**: System administration and reporting

## Rate Limiting
API endpoints are rate limited. Default limits:
- General API: 100 requests per 15 minutes (production)
- Auth endpoints: 10 requests per 15 minutes
      `,
      contact: {
        name: 'Guincoin Support',
      },
    },
    servers: [
      {
        url: env.BACKEND_URL || 'http://localhost:5000',
        description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie set after Google OAuth authentication',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-XSRF-TOKEN',
          description: 'CSRF token required for mutating requests (POST, PUT, DELETE)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            isManager: { type: 'boolean' },
            isAdmin: { type: 'boolean' },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['earned', 'allotment'],
            },
            balance: { type: 'number', format: 'decimal' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['award', 'transfer', 'wellness_reward', 'purchase', 'deposit', 'allotment_deposit'],
            },
            amount: { type: 'number', format: 'decimal' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            fromAccount: { $ref: '#/components/schemas/Account' },
            toAccount: { $ref: '#/components/schemas/Account' },
          },
        },
        WellnessTask: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            instructions: { type: 'string', nullable: true },
            coinValue: { type: 'number', format: 'decimal' },
            frequencyRule: {
              type: 'string',
              enum: ['one_time', 'annual', 'quarterly'],
            },
            isActive: { type: 'boolean' },
            formTemplateUrl: { type: 'string', nullable: true },
          },
        },
        StoreProduct: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            priceGuincoin: { type: 'number', format: 'decimal' },
            imageUrls: {
              type: 'array',
              items: { type: 'string' },
            },
            source: {
              type: 'string',
              enum: ['custom', 'amazon'],
            },
            isActive: { type: 'boolean' },
          },
        },
        PurchaseOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'fulfilled', 'cancelled'],
            },
            priceGuincoin: { type: 'number', format: 'decimal' },
            shippingAddress: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            product: { $ref: '#/components/schemas/StoreProduct' },
          },
        },
      },
    },
    security: [
      { sessionAuth: [] },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
