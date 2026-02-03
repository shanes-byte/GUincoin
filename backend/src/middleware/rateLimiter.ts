// Simple in-memory rate limiter with periodic cleanup
// For production at scale, consider Redis-based rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks — runs every 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
      });
    }

    entry.count++;
    next();
  };
};
