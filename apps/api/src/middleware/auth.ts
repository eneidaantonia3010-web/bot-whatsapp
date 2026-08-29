// ============================================
// Authentication & Authorization Middleware
// ============================================

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

function isValidApiKey(providedKey: string | string[] | undefined): boolean {
  if (!providedKey || typeof providedKey !== 'string' || !config.API_SECRET_KEY) {
    return false;
  }
  const providedBuffer = Buffer.from(providedKey);
  const secretBuffer = Buffer.from(config.API_SECRET_KEY);
  if (providedBuffer.length !== secretBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuffer, secretBuffer);
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Allow internal service-to-service requests via constant-time verified API key
  const apiKey = req.headers['x-api-key'] || req.headers['x-bot-key'];
  if (isValidApiKey(apiKey)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  let token = '';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token faltante' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token inválido o expirado' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-bot-key'];
  if (isValidApiKey(apiKey)) {
    return next();
  }

  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador' });
    }
    next();
  });
}

