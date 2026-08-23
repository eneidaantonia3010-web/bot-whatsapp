// ============================================
// Authentication & Authorization Middleware
// ============================================

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

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Allow internal service-to-service requests via API key
  const apiKey = req.headers['x-api-key'] || req.headers['x-bot-key'];
  if (apiKey && (apiKey === config.API_SECRET_KEY || apiKey === config.WEBHOOK_VERIFY_TOKEN)) {
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
  if (apiKey && (apiKey === config.API_SECRET_KEY || apiKey === config.WEBHOOK_VERIFY_TOKEN)) {
    return next();
  }

  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador' });
    }
    next();
  });
}

