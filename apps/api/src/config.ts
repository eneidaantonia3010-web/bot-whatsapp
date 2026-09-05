// ============================================
// Glow Studio — Centralized API Configuration (Zod Validated)
// ============================================

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// Define the environment schema with Zod
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://localhost:5432/glow_studio'),

  // Auth / Security
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET is required')
    .default(isProd ? '' : 'glow-studio-dev-secret-key-32chars-min!'),
  API_SECRET_KEY: z.string().default('glow-studio-internal-secret-2026'),
  WEBHOOK_VERIFY_TOKEN: z.string().default(''),
  META_APP_SECRET: z.string().default(''),

  // Service URLs
  BOT_URL: z
    .string()
    .default(isProd ? 'https://glow-studio-bot-alrb.onrender.com' : 'http://localhost:8000'),
  FRONTEND_URL: z
    .string()
    .default(isProd ? 'https://glow-studio-web.onrender.com' : 'http://localhost:3000'),

  // WhatsApp
  SALON_WHATSAPP: z
    .string()
    .default('5491178296781')
    .transform((val) => val.replace(/\D/g, '') || '5491178296781'),
  WHATSAPP_PHONE_ID: z.string().default(''),
  WHATSAPP_TOKEN: z.string().default(''),
  META_PAGE_ACCESS_TOKEN: z.string().default(''),
  EVOLUTION_API_URL: z.string().default(''),
  EVOLUTION_API_KEY: z.string().default(''),

  // Google Calendar
  GOOGLE_CALENDAR_ID: z.string().default('primary'),
  GOOGLE_CREDENTIALS: z.string().default(''),
  INSTANCE_NAME: z.string().optional(),
});

export type RawConfig = z.infer<typeof envSchema>;

export interface AppConfig extends RawConfig {
  isProd: boolean;
  INSTANCE_NAME: string;
}

function loadAndValidateConfig(): AppConfig {
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET,
    API_SECRET_KEY: process.env.API_SECRET_KEY,
    WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN,
    META_APP_SECRET: process.env.META_APP_SECRET || process.env.WEBHOOK_APP_SECRET,
    BOT_URL: process.env.BOT_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    SALON_WHATSAPP: process.env.SALON_WHATSAPP,
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
    GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS,
    INSTANCE_NAME: process.env.INSTANCE_NAME,
  };

  // Filter out undefined and empty string values to allow Zod defaults
  const filteredEnv = Object.fromEntries(
    Object.entries(rawEnv).filter(([, v]) => v !== undefined && v !== '')
  );

  const parsed = envSchema.safeParse(filteredEnv);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMessage = `❌ [API Config Error] Invalid environment configuration:\n${errorDetails}`;

    if (isProd) {
      console.error(errorMessage);
      throw new Error(errorMessage);
    } else {
      console.warn(`⚠️ [API Config Warning] Issues detected in development environment:\n${errorDetails}`);
    }
  }

  const validData = parsed.success
    ? parsed.data
    : envSchema.parse({
        DATABASE_URL: 'postgresql://localhost:5432/glow_studio',
        JWT_SECRET: 'glow-studio-dev-secret-key-32chars-min!',
      });

  // Production critical validation
  if (isProd) {
    if (!validData.JWT_SECRET || validData.JWT_SECRET === 'glow-studio-dev-secret-key-32chars-min!') {
      throw new Error('CRITICAL CONFIG ERROR: JWT_SECRET must be set to a secure secret in production.');
    }
    if (!validData.DATABASE_URL || validData.DATABASE_URL.includes('localhost')) {
      throw new Error('CRITICAL CONFIG ERROR: DATABASE_URL cannot be localhost in production.');
    }
  }

  const instanceName =
    validData.INSTANCE_NAME || `glow-studio-${validData.SALON_WHATSAPP}`;

  return {
    ...validData,
    isProd,
    INSTANCE_NAME: instanceName,
  };
}

export const config = loadAndValidateConfig();
export default config;
