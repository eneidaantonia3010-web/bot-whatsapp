// ============================================
// Glow Studio — Centralized API Configuration
// ============================================

import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

function getRequiredEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  if (devFallback !== undefined && !isProd) {
    return devFallback;
  }
  if (isProd) {
    throw new Error(`CRITICAL CONFIG ERROR: Missing required environment variable "${key}" in production.`);
  }
  return devFallback || '';
}

export const config = {
  isProd,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),

  // Database
  DATABASE_URL: getRequiredEnv('DATABASE_URL', 'postgresql://localhost:5432/glow_studio'),

  // Auth / Security
  JWT_SECRET: getRequiredEnv('JWT_SECRET', process.env.NEXTAUTH_SECRET || (isProd ? '' : 'glow-studio-dev-secret-key-32chars-min!')),
  API_SECRET_KEY: process.env.API_SECRET_KEY || '',
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || '',
  META_APP_SECRET: process.env.META_APP_SECRET || process.env.WEBHOOK_APP_SECRET || '',

  // Service URLs
  BOT_URL: process.env.BOT_URL || (isProd ? 'https://glow-studio-bot-alrb.onrender.com' : 'http://localhost:8000'),
  FRONTEND_URL: process.env.FRONTEND_URL || (isProd ? 'https://glow-studio-web.onrender.com' : 'http://localhost:3000'),

  // WhatsApp
  SALON_WHATSAPP: (process.env.SALON_WHATSAPP || '5491178296781').replace(/\D/g, ''),
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || '',
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
  META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN || '',

  // Google Calendar
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
  GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS || '',
  INSTANCE_NAME: process.env.INSTANCE_NAME || `glow-studio-${(process.env.SALON_WHATSAPP || '5491178296781').replace(/\D/g, '')}`,
};
