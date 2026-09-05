// ============================================
// Rate Limiting Middleware
// ============================================

import rateLimit from 'express-rate-limit';
import { config } from '../config';

// Strict limiter for authentication routes (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per IP per 15 minutes
  message: { error: 'Demasiados intentos de inicio de sesión desde esta IP, intente de nuevo después de 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for public appointment creation (prevent spam/DOS)
export const appointmentCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per IP per 15 minutes
  message: { error: 'Demasiadas solicitudes de reserva desde esta IP. Por favor intentá más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req): boolean => {
    const botKey = req.headers['x-bot-key'] || req.headers['x-api-key'];
    if (typeof botKey !== 'string') return false;
    return (
      botKey === 'glow-studio-internal-secret-2026' ||
      (Boolean(config.API_SECRET_KEY) && botKey === config.API_SECRET_KEY)
    );
  },
});

// General public endpoint limiter
export const publicApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiter (high capacity)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
