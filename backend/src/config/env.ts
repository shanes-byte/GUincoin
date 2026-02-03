import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  BACKEND_URL: z.string().url().default('http://localhost:5000'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_WORKSPACE_DOMAIN: z.string().optional(),
  RATE_LIMIT_ENABLED: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  COOKIE_DOMAIN: z.string().optional(),
});

// In production, enforce required vars
const productionSchema = envSchema.extend({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters in production'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required in production'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required in production'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL in production'),
});

const isProduction = process.env.NODE_ENV === 'production';
const schema = isProduction ? productionSchema : envSchema;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error(`Environment validation failed: ${parsed.error.message}`);
}

export const env = {
  DATABASE_URL: parsed.data.DATABASE_URL,
  PORT: parsed.data.PORT,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
  BACKEND_URL: parsed.data.BACKEND_URL,
  SESSION_SECRET: parsed.data.SESSION_SECRET,
  NODE_ENV: parsed.data.NODE_ENV,
  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET,
  GOOGLE_WORKSPACE_DOMAIN: parsed.data.GOOGLE_WORKSPACE_DOMAIN,
  RATE_LIMIT_ENABLED: parsed.data.RATE_LIMIT_ENABLED,
  RATE_LIMIT_MAX: parsed.data.RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS: parsed.data.RATE_LIMIT_WINDOW_MS,
  COOKIE_DOMAIN: parsed.data.COOKIE_DOMAIN,
};
