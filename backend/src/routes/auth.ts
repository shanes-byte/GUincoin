import express from 'express';
import crypto from 'crypto';
import passport from '../config/auth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { env } from '../config/env';
import prisma from '../config/database';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management
 */

// Middleware to check if OAuth is configured
const requireOAuthConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'OAuth is not configured',
      message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables',
    });
  }
  next();
};

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google OAuth consent screen. After authentication, user is redirected back to the callback URL.
 *     parameters:
 *       - in: query
 *         name: popup
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Whether to use popup mode for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 *       503:
 *         description: OAuth not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *     security: []
 */
router.get(
  '/google',
  requireOAuthConfig,
  (req, res, next) => {
    // Generate cryptographic nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');
    (req.session as any).oauthNonce = nonce;

    // Encode both popup mode and nonce in state parameter
    const popup = req.query.popup === 'true' ? 'popup' : 'redirect';
    const state = JSON.stringify({ nonce, mode: popup });

    // Explicitly save session before redirecting to ensure nonce is persisted
    req.session.save((err) => {
      if (err) {
        console.error('[OAuth] Failed to save session before redirect:', err);
        return res.redirect(`${env.FRONTEND_URL}/login?error=session`);
      }
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        state,
      })(req, res, next);
    });
  }
);

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth callback
 *     description: Handles the OAuth callback from Google. On success, establishes a session and redirects to the dashboard.
 *     responses:
 *       302:
 *         description: Redirect to dashboard on success, or login page with error on failure
 *     security: []
 */
router.get(
  '/google/callback',
  requireOAuthConfig,
  passport.authenticate('google', { failureRedirect: `${env.FRONTEND_URL}/login?error=auth` }),
  (req: AuthRequest, res) => {
    // Validate OAuth state parameter for CSRF protection
    try {
      const state = JSON.parse(req.query.state as string || '{}');
      const sessionNonce = (req.session as any).oauthNonce;

      // Debug logging for session issues
      if (!sessionNonce) {
        console.error('[OAuth] No nonce in session. Session ID:', req.sessionID);
        console.error('[OAuth] Session keys:', Object.keys(req.session || {}));
      }

      if (!sessionNonce || state.nonce !== sessionNonce) {
        console.error('[OAuth] CSRF validation failed - nonce mismatch');
        return res.redirect(`${env.FRONTEND_URL}/login?error=csrf`);
      }
      // Clear nonce after use
      delete (req.session as any).oauthNonce;
    } catch (parseError) {
      console.error('[OAuth] Failed to parse state:', parseError);
      return res.redirect(`${env.FRONTEND_URL}/login?error=state`);
    }

    // Regenerate session to prevent session fixation attacks
    const passportUser = (req.session as any).passport;
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error('Session regeneration error:', regenerateErr);
        return res.redirect(`${env.FRONTEND_URL}/login?error=session`);
      }
      // Restore passport user data after regeneration
      if (passportUser) {
        (req.session as any).passport = passportUser;
      }
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.redirect(`${env.FRONTEND_URL}/login?error=session`);
        }
        // Redirect to dashboard
        res.redirect(`${env.FRONTEND_URL}/dashboard`);
      });
    });
  }
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user
 *     description: Returns the authenticated user's profile information
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    name: req.user!.name,
    isManager: req.user!.isManager,
    isAdmin: req.user!.isAdmin,
  });
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Ends the user's session and logs them out
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       500:
 *         description: Logout failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('[Logout] req.logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Destroy the session completely to clear all state including CSRF tokens
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('[Logout] Session destroy error:', destroyErr);
        // Still return success since user is logged out from passport
      }
      // Clear session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      // Clear CSRF cookie
      res.clearCookie('XSRF-TOKEN', {
        path: '/',
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// One-time admin setup endpoint (secured by secret)
router.post('/setup-admins', async (req, res) => {
  const { secret } = req.body;

  // Simple secret check - only works with correct secret
  if (secret !== 'GuincoinSetup2026!') {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  const adminEmails = ['shanes@guinco.com', 'landonm@guinco.com'];
  const results = [];

  for (const email of adminEmails) {
    try {
      const employee = await prisma.employee.upsert({
        where: { email },
        update: { isAdmin: true, isManager: true },
        create: {
          email,
          name: email.split('@')[0],
          isAdmin: true,
          isManager: true,
        },
      });
      results.push({ email, status: 'success', id: employee.id });
    } catch (err) {
      results.push({ email, status: 'error', error: String(err) });
    }
  }

  res.json({ message: 'Admin setup complete', results });
});

export default router;
