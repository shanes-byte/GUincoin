import express from 'express';
import passport from '../config/auth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { env } from '../config/env';

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
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Google OAuth callback - redirect to dashboard on success
router.get(
  '/google/callback',
  requireOAuthConfig,
  passport.authenticate('google', { failureRedirect: `${env.FRONTEND_URL}/login?error=auth` }),
  (req: AuthRequest, res) => {
    // Explicitly save session before redirect to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(`${env.FRONTEND_URL}/login?error=session`);
      }
      // Redirect to dashboard
      res.redirect(`${env.FRONTEND_URL}/dashboard`);
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

export default router;
