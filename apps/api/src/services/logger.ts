// ============================================
// Glow Studio — Structured Logger & APM (Pino & Sentry)
// ============================================

import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'glow-studio-api',
    env: config.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function captureException(error: unknown, context?: Record<string, any>) {
  logger.error({ err: error, ...context }, 'Unhandled error captured');
  // If Sentry DSN is configured in the future, Sentry.captureException can be called here
}
