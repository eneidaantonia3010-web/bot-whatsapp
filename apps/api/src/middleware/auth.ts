// ============================================
// Authentication & Authorization Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
const API_SECRET_KEY = process.env.API_SECRET_KEY;

if (!JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET or NEXTAUTH_SECRET environment variable is missing.");
}


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
  if (apiKey && (apiKey === API_SECRET_KEY || apiKey === process.env.WEBHOOK_VERIFY_TOKEN)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token faltante' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token inválido o expirado' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador' });
    }
    next();
  });
}

