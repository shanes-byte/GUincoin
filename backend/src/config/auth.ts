import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database';
import pendingTransferService from '../services/pendingTransferService';
import accountService from '../services/accountService';
import { env } from './env';

// Conditionally register Google OAuth strategy if credentials are provided
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.FRONTEND_URL}/api/auth/google/callback`,
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

          // Find or create employee
          let employee = await prisma.employee.findUnique({
            where: { email },
          });

          if (!employee) {
            employee = await prisma.employee.create({
              data: {
                email,
                name: profile.displayName || email.split('@')[0],
                isManager: false, // Default, can be updated by admin
                isAdmin: false, // Default, can be updated by admin
              },
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
