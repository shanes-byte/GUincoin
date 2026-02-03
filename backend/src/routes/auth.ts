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

// Google OAuth login
router.get(
  '/google',
  requireOAuthConfig,
  (req, res, next) => {
    // Use OAuth state parameter to track popup mode (persists through redirect)
    const state = req.query.popup === 'true' ? 'popup' : 'redirect';
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: state,
    })(req, res, next);
  }
);

// Google OAuth callback
router.get(
  '/google/callback',
  requireOAuthConfig,
  passport.authenticate('google', { failureRedirect: '/login?error=auth' }),
  (req: AuthRequest, res) => {
    // Check state parameter to determine popup mode (passed through Google)
    const isPopup = req.query.state === 'popup';

    // Explicitly save session before redirect to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        const errorUrl = isPopup
          ? `${env.FRONTEND_URL}/oauth/callback?success=false&error=session`
          : '/login?error=session';
        return res.redirect(errorUrl);
      }

      // Redirect to appropriate page based on popup mode
      const successUrl = isPopup
        ? `${env.FRONTEND_URL}/oauth/callback?success=true`
        : `${env.FRONTEND_URL}/dashboard`;
      res.redirect(successUrl);
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
