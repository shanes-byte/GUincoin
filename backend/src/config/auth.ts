import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database';
import pendingTransferService from '../services/pendingTransferService';
import accountService from '../services/accountService';
import emailService from '../services/emailService';
import { env } from './env';

// Emails that should automatically be granted admin access
const AUTO_ADMIN_EMAILS = [
  'shanes@guinco.com',
  'landonm@guinco.com',
];

// Conditionally register Google OAuth strategy if credentials are provided
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  // Use BACKEND_URL for OAuth callback (API endpoint)
  const callbackURL = `${env.BACKEND_URL}/api/auth/google/callback`;
  console.log(`[OAuth] Callback URL: ${callbackURL}`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Verify Google Workspace domain
          const workspaceDomain = env.GOOGLE_WORKSPACE_DOMAIN;
          if (workspaceDomain && !email.endsWith(workspaceDomain)) {
            return done(new Error(`Email must be from ${workspaceDomain} domain`), undefined);
          }

          // Check if this email should be auto-admin
          const shouldBeAdmin = AUTO_ADMIN_EMAILS.includes(email);

          // Find or create employee
          let employee = await prisma.employee.findUnique({
            where: { email },
          });

          if (!employee) {
            const displayName = profile.displayName || email.split('@')[0];
            employee = await prisma.employee.create({
              data: {
                email,
                name: displayName,
                isManager: shouldBeAdmin,
                isAdmin: shouldBeAdmin,
              },
            });

            // Send welcome email to new users
            emailService.sendWelcomeNotification(email, displayName).catch((err) => {
              console.error('Failed to send welcome email:', err);
            });
          } else if (shouldBeAdmin && (!employee.isAdmin || !employee.isManager)) {
            // Upgrade existing user to admin if they're in the auto-admin list
            employee = await prisma.employee.update({
              where: { email },
              data: { isAdmin: true, isManager: true },
            });
          }

          // Ensure account exists (auto-create if missing)
          await accountService.getOrCreateAccount(employee.id);

          await pendingTransferService.claimPendingTransfers(email);

          return done(null, employee);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
} else {
  console.warn('⚠️  Google OAuth credentials not found. OAuth login will be disabled.');
  console.warn('   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file to enable OAuth.');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { account: true },
    });
    done(null, employee);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
