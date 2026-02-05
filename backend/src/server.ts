import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import session, { Store } from 'express-session';
import pgSession from 'connect-pg-simple';
import swaggerUi from 'swagger-ui-express';
import passport from './config/auth';
import { rateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { getHealthSummary, setSessionStoreType } from './utils/health';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupGracefulShutdown } from './utils/gracefulShutdown';
import { SESSION_MAX_AGE_MS } from './config/constants';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import managerRoutes from './routes/manager';
import transferRoutes from './routes/transfers';
import wellnessRoutes from './routes/wellness';
import adminRoutes from './routes/admin/index';
import fileRoutes from './routes/files';
import storeRoutes from './routes/store';
import googleChatRoutes from './routes/googleChat';
import bannerRoutes from './routes/banners';
import gamesRoutes from './routes/games';
import superBowlRoutes from './routes/superBowl';

dotenv.config();

const PgStore = pgSession(session);

/**
 * Create session store with fallback to memory store if PostgreSQL fails.
 */
function createSessionStore(): Store | undefined {
  try {
    console.log('[SessionStore] Attempting to create PostgreSQL session store...');
    const pgStore = new PgStore({
      conString: env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 min
      errorLog: (err) => {
        console.error('[SessionStore] PostgreSQL error:', err.message);
      },
    });

    // Add event listener for errors
    pgStore.on('error', (error) => {
      console.error('[SessionStore] Store error event:', error.message);
    });

    console.log('[SessionStore] PostgreSQL session store created successfully');
    setSessionStoreType('postgresql');
    return pgStore;
  } catch (error) {
    console.warn(
      '[SessionStore] Failed to create PostgreSQL store, falling back to memory store:',
      error instanceof Error ? error.message : error
    );
    console.warn('[SessionStore] WARNING: Memory store is not suitable for production!');
    setSessionStoreType('memory');
    return undefined; // Express will use default MemoryStore
  }
}

const app = express();
const PORT = env.PORT;

// Trust first proxy (nginx/Railway) so secure cookies work behind reverse proxy
app.set('trust proxy', 1);

// Fix for Railway: Force HTTPS protocol detection in production
// Railway serves all traffic over HTTPS externally but the internal proxy
// may send X-Forwarded-Proto: http. This middleware corrects that.
if (env.NODE_ENV === 'production') {
  app.use((req, _res, next) => {
    // Force the protocol to https in production
    // This ensures secure cookies are set correctly
    req.headers['x-forwarded-proto'] = 'https';
    next();
  });
  console.log('[Server] HTTPS protocol fix enabled for production');
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"], // Allow images from HTTPS sources
      connectSrc: ["'self'", env.FRONTEND_URL, env.BACKEND_URL],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility with external resources
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for API
}));

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with PostgreSQL store (with memory fallback)
const sessionStore = createSessionStore();

// Build cookie options - only include domain if explicitly set
const sessionCookieOptions: {
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
} = {
  secure: env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
};
// Only add domain if explicitly configured (don't pass undefined)
if (env.COOKIE_DOMAIN) {
  sessionCookieOptions.domain = env.COOKIE_DOMAIN;
}

console.log('[Session] Cookie options:', JSON.stringify(sessionCookieOptions));
console.log('[Session] NODE_ENV:', env.NODE_ENV);

app.use(session({
  store: sessionStore,
  secret: env.SESSION_SECRET,
  name: 'connect.sid',
  resave: false, // Don't save session if unmodified
  saveUninitialized: true, // Create session for anonymous users
  proxy: true, // Trust the reverse proxy (Railway)
  cookie: sessionCookieOptions,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection via double-submit cookie pattern
app.use((req, res, next) => {
  // Generate CSRF token if not present in session
  if (!(req.session as any).csrfToken) {
    (req.session as any).csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Set CSRF cookie on every response so frontend can read it
  // Must match session cookie settings for consistency
  const csrfCookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    domain?: string;
  } = {
    httpOnly: false, // Frontend must read this
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
  if (env.COOKIE_DOMAIN) {
    csrfCookieOptions.domain = env.COOKIE_DOMAIN;
  }
  res.cookie('XSRF-TOKEN', (req.session as any).csrfToken, csrfCookieOptions);

  // Validate CSRF token on mutating requests
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (!safeMethods.includes(req.method)) {
    const headerToken = req.headers['x-xsrf-token'] as string;
    const sessionToken = (req.session as any).csrfToken;

    // Skip CSRF for OAuth callbacks and webhook endpoints
    const csrfExemptPaths = ['/api/auth/google', '/api/auth/google/callback', '/api/integrations/google-chat'];
    const isExempt = csrfExemptPaths.some((p) => req.path.startsWith(p));

    if (!isExempt && (!headerToken || headerToken !== sessionToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }

  next();
});

// Apply rate limiting to API routes (except health check)
if (env.RATE_LIMIT_ENABLED) {
  const isProd = env.NODE_ENV === 'production';
  const maxRequests = env.RATE_LIMIT_MAX ?? (isProd ? 100 : 1000);
  const windowMs = env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000;
  if (Number.isFinite(maxRequests) && maxRequests > 0) {
    app.use('/api', rateLimiter(maxRequests, windowMs));
  }
}

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authRateLimiter(10, 15 * 60 * 1000));

// Simple liveness check (doesn't depend on database)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Debug endpoint for session/cookie diagnostics (only in development or with secret)
app.get('/api/debug/session', (req, res) => {
  const debugSecret = req.query.secret;
  if (env.NODE_ENV === 'production' && debugSecret !== 'GuincoinDebug2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    sessionID: req.sessionID,
    sessionCookiePresent: req.headers.cookie?.includes('connect.sid') || false,
    xsrfCookiePresent: req.headers.cookie?.includes('XSRF-TOKEN') || false,
    rawCookies: req.headers.cookie || 'none',
    sessionKeys: Object.keys(req.session || {}),
    secure: req.secure,
    protocol: req.protocol,
    xForwardedProto: req.headers['x-forwarded-proto'],
    host: req.headers.host,
    origin: req.headers.origin,
    nodeEnv: env.NODE_ENV,
  });
});

// Full health check endpoint (checks all dependencies)
app.get('/health', async (req, res, next) => {
  try {
    const summary = await getHealthSummary();
    const statusCode = summary.status === 'ok' ? 200 : 503;

    res
      .status(statusCode)
      .setHeader('Cache-Control', 'no-store')
      .json(summary);
  } catch (error) {
    next(error);
  }
});

// API Documentation (Swagger UI)
// Swagger UI requires relaxed CSP, so we apply custom headers for /api-docs routes
app.use('/api-docs', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Guincoin API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/integrations/google-chat', googleChatRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/super-bowl', superBowlRoutes);

// 404 handler for unmatched API routes
app.use('/api', notFoundHandler);

// Serve frontend static files in production
if (env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend-dist');
  const fs = require('fs');

  // Debug: Check if frontend build exists
  console.log(`[Frontend] Looking for build at: ${frontendBuildPath}`);
  console.log(`[Frontend] __dirname is: ${__dirname}`);
  console.log(`[Frontend] Directory exists: ${fs.existsSync(frontendBuildPath)}`);
  if (fs.existsSync(frontendBuildPath)) {
    console.log(`[Frontend] Contents: ${fs.readdirSync(frontendBuildPath).join(', ')}`);
  }

  // Serve static files
  app.use(express.static(frontendBuildPath));

  // Catch-all route for client-side routing (React Router)
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`Frontend not found. Looking at: ${frontendBuildPath}`);
    }
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Pre-warm database connection before accepting requests
const startServer = async () => {
  try {
    // Import prisma and test connection
    const prisma = (await import('./config/database')).default;
    console.log('[Startup] Connecting to database...');
    await prisma.$connect();
    console.log('[Startup] Database connected successfully');

    // Warm up with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Startup] Database warmed up');
  } catch (error) {
    console.error('[Startup] Database connection failed:', error);
    // Continue anyway - health check will report the issue
  }

  // Start server after warming up
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });

  // Setup graceful shutdown handling
  setupGracefulShutdown(server);
};

startServer();

export default app;
