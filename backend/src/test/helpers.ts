/**
 * Test helper utilities for API testing.
 *
 * Provides utilities for creating authenticated sessions,
 * test data factories, and common test assertions.
 */

import { Express } from 'express';
import request from 'supertest';

/**
 * Creates a supertest agent with an authenticated session.
 *
 * @param app - Express application instance
 * @param userId - User ID to authenticate as
 * @returns Supertest agent with session cookie
 */
export async function createAuthenticatedAgent(app: Express, userId: string) {
  const agent = request.agent(app);
  // In test environment, we can set the session directly
  // This bypasses OAuth for testing purposes
  await agent
    .post('/api/test/login')
    .send({ userId })
    .expect(200);

  return agent;
}

/**
 * Factory for creating test data.
 */
export const testData = {
  /**
   * Creates a unique email for testing.
   */
  uniqueEmail: () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,

  /**
   * Creates mock employee data.
   */
  mockEmployee: (overrides = {}) => ({
    email: testData.uniqueEmail(),
    name: 'Test User',
    isManager: false,
    isAdmin: false,
    ...overrides,
  }),

  /**
   * Creates mock transaction data.
   */
  mockTransaction: (overrides = {}) => ({
    amount: 100,
    description: 'Test transaction',
    transactionType: 'manager_award',
    ...overrides,
  }),
};

/**
 * Waits for a specified duration.
 * Useful for testing rate limits or async operations.
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
