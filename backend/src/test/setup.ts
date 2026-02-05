/**
 * Vitest test setup file.
 *
 * This file runs before all tests to configure the test environment.
 * It sets up environment variables and any global test fixtures.
 */

import { beforeAll, afterAll } from 'vitest';

// Ensure test environment
process.env.NODE_ENV = 'test';

// Use test database URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/guincoin_test';
}

// Set required environment variables for testing
process.env.SESSION_SECRET = 'test-session-secret-at-least-16-chars';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:5000';

// Disable rate limiting in tests
process.env.RATE_LIMIT_ENABLED = 'false';

beforeAll(async () => {
  // Global setup before all tests
  console.log('Starting test suite...');
});

afterAll(async () => {
  // Global cleanup after all tests
  console.log('Test suite complete.');
});
