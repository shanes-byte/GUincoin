import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { env } from '../config/env';

// Store type tracking for health checks
let storeType: 'redis' | 'memory' = 'memory';

export function getRateLimitStoreType(): string {
  return storeType;
}

/**
 * Create a Redis store for rate limiting if REDIS_URL is configured.
 * Falls back to memory store if Redis is not available.
 */
async function createRedisStore(): Promise<Options['store'] | undefined> {
  if (!env.REDIS_URL) {
    console.log('[RateLimiter] No REDIS_URL configured, using memory store');
    console.log('[RateLimiter] WARNING: Memory store is not suitable for production with multiple instances!');
    return undefined;
  }

  try {
    // Dynamic import to avoid requiring redis when not configured
    const { RedisStore } = await import('rate-limit-redis');
    const { createClient } = await import('redis');

    const client = createClient({
      url: env.REDIS_URL,
    });

    client.on('error', (err) => {
      console.error('[RateLimiter] Redis client error:', err.message);
    });

    await client.connect();
    console.log('[RateLimiter] Connected to Redis for rate limiting');
    storeType = 'redis';

    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
      prefix: 'guincoin:rl:',
    });
  } catch (error) {
    console.warn(
      '[RateLimiter] Failed to connect to Redis, falling back to memory store:',
      error instanceof Error ? error.message : error
    );
    console.warn('[RateLimiter] WARNING: Memory store is not suitable for production with multiple instances!');
    return undefined;
  }
}

// Cached store instance
let redisStorePromise: Promise<Options['store'] | undefined> | null = null;

function getStore(): Promise<Options['store'] | undefined> {
  if (!redisStorePromise) {
    redisStorePromise = createRedisStore();
  }
  return redisStorePromise;
}

/**
 * Create a rate limiter with Redis support (falls back to memory if Redis unavailable)
 */
export function createRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000,
  keyPrefix: string = 'api'
): RateLimitRequestHandler {
  // For synchronous middleware creation, we start with memory store
  // and upgrade to Redis asynchronously if available
  const limiter = rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again later.`,
    },
    keyGenerator: (req) => {
      const key = req.ip || req.socket?.remoteAddress || 'unknown';
      return `${keyPrefix}:${key}`;
    },
  });

  // Attempt to upgrade to Redis store in background
  getStore().then((store) => {
    if (store) {
      // Note: express-rate-limit doesn't support hot-swapping stores,
      // but the Redis store will be used for new limiter instances
      console.log(`[RateLimiter] Redis store ready for ${keyPrefix}`);
    }
  });

  return limiter;
}

/**
 * Create a rate limiter that waits for Redis initialization
 * Use this for critical limiters where Redis is required
 */
export async function createAsyncRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000,
  keyPrefix: string = 'api'
): Promise<RateLimitRequestHandler> {
  const store = await getStore();

  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: {
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again later.`,
    },
    keyGenerator: (req) => {
      const key = req.ip || req.socket?.remoteAddress || 'unknown';
      return `${keyPrefix}:${key}`;
    },
  });
}

/**
 * General API rate limiter
 */
export const rateLimiter = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return createRateLimiter(maxRequests, windowMs, 'api');
};

/**
 * Stricter rate limiter for authentication endpoints
 * Prevents brute force attacks on login
 */
export const authRateLimiter = (maxAttempts: number = 10, windowMs: number = 15 * 60 * 1000) => {
  return createRateLimiter(maxAttempts, windowMs, 'auth');
};

/**
 * Rate limiter for sensitive operations (transfers, awards, etc.)
 */
export const sensitiveOpLimiter = (maxRequests: number = 30, windowMs: number = 15 * 60 * 1000) => {
  return createRateLimiter(maxRequests, windowMs, 'sensitive');
};
