# Guincoin Backend Testing Guide

This guide explains how to write and run tests for the Guincoin backend.

## Test Framework

We use [Vitest](https://vitest.dev/) for testing, with the following configuration:

- **Test files**: `src/**/*.test.ts` and `src/**/*.spec.ts`
- **Environment**: Node.js
- **Coverage**: V8 provider with text, JSON, and HTML reporters
- **Parallelism**: Disabled to prevent database conflicts

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npm test -- --run src/services/storeService.test.ts

# Run tests matching a pattern
npm test -- --run -t "usdToGuincoin"
```

## Test Structure

### Unit Tests

Unit tests verify individual functions and services in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { usdToGuincoin } from './storeService';

describe('usdToGuincoin', () => {
  it('should convert whole dollar amounts', () => {
    expect(usdToGuincoin(10)).toBe(100);
  });
});
```

### Integration Tests

Integration tests verify API endpoints using Supertest.

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server';

describe('GET /api/store/products', () => {
  it('should return products for authenticated users', async () => {
    const response = await request(app)
      .get('/api/store/products')
      .set('Cookie', 'connect.sid=test-session');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

## Test Helpers

Use the test helpers in `src/test/helpers.ts`:

```typescript
import { testData, wait } from '../test/helpers';

// Generate unique test data
const email = testData.uniqueEmail();
const employee = testData.mockEmployee({ isManager: true });

// Wait for async operations
await wait(100);
```

## Mocking Prisma Decimal

Prisma Decimal types need special handling in tests:

```typescript
// Helper to mock Prisma Decimal
const mockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
  valueOf: () => value,
  [Symbol.toPrimitive]: () => value,
});

const mockProduct = {
  priceGuincoin: mockDecimal(100),
  // ...
};
```

## Database Testing

For tests that require database access:

1. **Use a test database**: Set `DATABASE_URL` to point to a test database
2. **Clean up after tests**: Use `beforeEach`/`afterEach` hooks
3. **Use transactions**: Wrap tests in transactions and rollback

```typescript
import { beforeEach, afterEach } from 'vitest';
import prisma from '../config/database';

beforeEach(async () => {
  // Start transaction
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // Rollback changes
  await prisma.$executeRaw`ROLLBACK`;
});
```

## Test Environment

The test setup file (`src/test/setup.ts`) configures:

- `NODE_ENV=test`
- Test database URL (if not set)
- Required environment variables
- Rate limiting disabled

## Writing Good Tests

1. **Test behavior, not implementation**: Focus on what the function should do
2. **Use descriptive names**: `it('should return 401 when not authenticated')`
3. **One assertion per test**: Makes failures easier to diagnose
4. **Arrange-Act-Assert pattern**: Structure tests clearly
5. **Mock external dependencies**: Don't test external services

```typescript
describe('postTransaction', () => {
  it('should throw error for insufficient funds', async () => {
    // Arrange
    const accountId = await createTestAccount({ balance: 50 });
    const txId = await createPendingDebit(accountId, 100);

    // Act & Assert
    await expect(
      transactionService.postTransaction(txId)
    ).rejects.toThrow('Insufficient funds');
  });
});
```

## Coverage Goals

- **Minimum coverage**: 70%
- **Critical paths**: 90%+ (transactions, authentication)
- **Focus areas**:
  - Service methods
  - API route handlers
  - Middleware functions

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch

Configuration is in `.github/workflows/test.yml` (if applicable).

## Troubleshooting

### Tests hang
- Check for unclosed database connections
- Ensure async operations complete

### Database errors
- Verify `DATABASE_URL` is set correctly
- Check if test database exists and is running

### Timeout errors
- Increase timeout: `testTimeout: 30000` in vitest.config.ts
- Check for slow database queries
