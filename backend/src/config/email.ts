import nodemailer, { Transporter } from 'nodemailer';
import prisma from './database';

let cachedTransporter: Transporter | null = null;
let lastConfigHash: string | null = null;

// Check if env-based SMTP is configured
const hasEnvSmtpCredentials =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);

if (!hasEnvSmtpCredentials) {
  console.warn(
    '[email] SMTP environment variables not found - will check database settings or use console fallback.'
  );
}

// Helper to create config hash for cache invalidation
const createConfigHash = (config: {
  host?: string | null;
  port?: number;
  secure?: boolean;
  user?: string | null;
  pass?: string | null;
}) => {
  return `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass?.slice(0, 4) || ''}`;
};

// Get SMTP settings from database
async function getDbSmtpSettings() {
  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: 'smtp' },
    });
    return settings;
  } catch (error) {
    // Database may not be ready yet (during migrations)
    return null;
  }
}

// Create transporter based on current settings
async function createTransporter(): Promise<Transporter> {
  // First check database settings
  const dbSettings = await getDbSmtpSettings();

  if (dbSettings?.isEnabled && dbSettings.host && dbSettings.user && dbSettings.pass) {
    const configHash = createConfigHash(dbSettings);

    // Return cached if config unchanged
    if (cachedTransporter && lastConfigHash === configHash) {
      return cachedTransporter;
    }

    console.log('[email] Using database SMTP settings');
    cachedTransporter = nodemailer.createTransport({
      host: dbSettings.host,
      port: dbSettings.port || 587,
      secure: dbSettings.secure || false,
      auth: {
        user: dbSettings.user,
        pass: dbSettings.pass,
      },
    });
    lastConfigHash = configHash;
    return cachedTransporter;
  }

  // Fall back to environment variables
  if (hasEnvSmtpCredentials) {
    const envConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: Number(process.env.SMTP_PORT) === 465,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };

    const configHash = createConfigHash(envConfig);

    if (cachedTransporter && lastConfigHash === configHash) {
      return cachedTransporter;
    }

    console.log('[email] Using environment variable SMTP settings');
    cachedTransporter = nodemailer.createTransport({
      host: envConfig.host,
      port: envConfig.port,
      secure: envConfig.secure,
      auth: {
        user: envConfig.user,
        pass: envConfig.pass,
      },
    });
    lastConfigHash = configHash;
    return cachedTransporter;
  }

  // No SMTP configured - use JSON transport (console logging)
  if (!cachedTransporter || lastConfigHash !== 'json') {
    console.log('[email] No SMTP configured - emails will be logged to console');
    cachedTransporter = nodemailer.createTransport({ jsonTransport: true } as any);
    lastConfigHash = 'json';
  }

  return cachedTransporter;
}

// Check if email is configured (either DB or env)
export async function checkEmailConfigured(): Promise<boolean> {
  const dbSettings = await getDbSmtpSettings();
  if (dbSettings?.isEnabled && dbSettings.host && dbSettings.user && dbSettings.pass) {
    return true;
  }
  return hasEnvSmtpCredentials;
}

// For health checks - synchronous check of env vars
export const isEmailConfigured = hasEnvSmtpCredentials;

// Get the from email address
export async function getFromEmail(): Promise<string> {
  const dbSettings = await getDbSmtpSettings();
  if (dbSettings?.fromEmail) {
    return dbSettings.fromEmail;
  }
  if (dbSettings?.user) {
    return dbSettings.user;
  }
  return process.env.SMTP_USER || 'noreply@guincoin.com';
}

// Get the from name
export async function getFromName(): Promise<string> {
  const dbSettings = await getDbSmtpSettings();
  return dbSettings?.fromName || 'Guincoin Rewards';
}

// Clear cached transporter (call after settings update)
export function clearTransporterCache() {
  cachedTransporter = null;
  lastConfigHash = null;
}

// Export async getter for transporter
export async function getTransporter(): Promise<Transporter> {
  return createTransporter();
}

// For backward compatibility - create initial transporter
const transporter = hasEnvSmtpCredentials
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : nodemailer.createTransport({ jsonTransport: true } as any);

export default transporter;
