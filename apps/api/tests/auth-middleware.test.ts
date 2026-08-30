// ============================================
// Auth & Admin Middleware Unit Tests
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../src/middleware/auth';
import { config } from '../src/config';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      query: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  describe('requireAuth', () => {
    it('should allow bypass when valid x-api-key header is provided', () => {
      // Configure test API_SECRET_KEY
      (config as any).API_SECRET_KEY = 'test-salon-api-secret-key-123';
      mockRequest.headers = {
        'x-api-key': 'test-salon-api-secret-key-123',
      };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow bypass when valid x-bot-key header is provided', () => {
      (config as any).API_SECRET_KEY = 'test-salon-api-secret-key-123';
      mockRequest.headers = {
        'x-bot-key': 'test-salon-api-secret-key-123',
      };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid api-key and fall back to token check', () => {
      (config as any).API_SECRET_KEY = 'test-salon-api-secret-key-123';
      mockRequest.headers = {
        'x-api-key': 'wrong-key',
      };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acceso no autorizado: Token faltante',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when neither api key nor token is provided', () => {
      mockRequest.headers = {};

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acceso no autorizado: Token faltante',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should successfully authenticate with valid Bearer JWT token', () => {
      const payload = { id: 'usr_123', email: 'sofia@glowstudio.com', role: 'ADMIN' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.email).toBe('sofia@glowstudio.com');
      expect(mockRequest.user?.role).toBe('ADMIN');
    });

    it('should successfully authenticate with token passed in query parameter', () => {
      const payload = { id: 'usr_staff_456', email: 'camila@glowstudio.com', role: 'STAFF' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });

      mockRequest.query = { token };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user?.email).toBe('camila@glowstudio.com');
      expect(mockRequest.user?.role).toBe('STAFF');
    });

    it('should return 401 when token is invalid or corrupted', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.signature',
      };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acceso no autorizado: Token inválido o expirado',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const payload = { id: 'usr_expired', email: 'test@glowstudio.com', role: 'ADMIN' };
      const expiredToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '-1s' });

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      requireAuth(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acceso no autorizado: Token inválido o expirado',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for valid API key', () => {
      (config as any).API_SECRET_KEY = 'test-salon-api-secret-key-123';
      mockRequest.headers = {
        'x-api-key': 'test-salon-api-secret-key-123',
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow access when user role is ADMIN', () => {
      const payload = { id: 'usr_admin', email: 'sofia@glowstudio.com', role: 'ADMIN' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is STAFF or non-admin', () => {
      const payload = { id: 'usr_staff', email: 'valentina@glowstudio.com', role: 'STAFF' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acceso denegado: Se requieren permisos de administrador',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
