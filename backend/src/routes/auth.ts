import express from 'express';
import crypto from 'crypto';
import passport from '../config/auth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { env } from '../config/env';
import prisma from '../config/database';

const router = express.Router();

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

// Google OAuth login - direct redirect flow
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

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state,
    })(req, res, next);
  }
);

// Google OAuth callback - redirect to dashboard on success
router.get(
  '/google/callback',
  requireOAuthConfig,
  passport.authenticate('google', { failureRedirect: `${env.FRONTEND_URL}/login?error=auth` }),
  (req: AuthRequest, res) => {
    // Validate OAuth state parameter for CSRF protection
    try {
      const state = JSON.parse(req.query.state as string || '{}');
      const sessionNonce = (req.session as any).oauthNonce;
      if (!sessionNonce || state.nonce !== sessionNonce) {
        return res.redirect(`${env.FRONTEND_URL}/login?error=csrf`);
      }
      // Clear nonce after use
      delete (req.session as any).oauthNonce;
    } catch {
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

// Get current user
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    name: req.user!.name,
    isManager: req.user!.isManager,
    isAdmin: req.user!.isAdmin,
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
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
