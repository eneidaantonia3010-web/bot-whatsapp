// ============================================
// HTTP Integration Tests (Supertest + Express App)
// Testing Core Health, Services, Metrics, Auth & WhatsApp Admin
// ============================================

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/services/prisma';

describe('HTTP Integration Suite (Express API)', () => {
  beforeAll(async () => {
    // Ensure test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Clean up connections if opened
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });

  describe('GET / and GET /api/health', () => {
    it('should return 200 OK for root ping endpoint', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'glow-studio-api');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return deep health check status on /api/health', async () => {
      const res = await request(app).get('/api/health');

      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('service', 'glow-studio-api');
      expect(res.body).toHaveProperty('database');
      expect(['connected', 'disconnected']).toContain(res.body.database);
    });
  });

  describe('GET /api/services', () => {
    it('should return 200 and an array of active salon services', async () => {
      const res = await request(app).get('/api/services');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        const service = res.body[0];
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('price');
        expect(service).toHaveProperty('duration');
        expect(service).toHaveProperty('category');
      }
    });
  });

  describe('GET /api/metrics (Observability & APM)', () => {
    it('should return 200 and full system metrics (uptime, memory RSS/heap, DB & WhatsApp status, version)', async () => {
      const res = await request(app).get('/api/metrics');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'glow-studio-api');
      expect(res.body).toHaveProperty('version', '1.0.0');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('environment');

      // Uptime
      expect(res.body).toHaveProperty('uptime');
      expect(typeof res.body.uptime.seconds).toBe('number');
      expect(typeof res.body.uptime.formatted).toBe('string');

      // Memory metrics (RSS, Heap)
      expect(res.body).toHaveProperty('memory');
      expect(typeof res.body.memory.rss).toBe('number');
      expect(typeof res.body.memory.heapTotal).toBe('number');
      expect(typeof res.body.memory.heapUsed).toBe('number');
      expect(typeof res.body.memory.rssMb).toBe('number');
      expect(typeof res.body.memory.heapUsedMb).toBe('number');

      // Database status
      expect(res.body).toHaveProperty('database');
      expect(['connected', 'disconnected']).toContain(res.body.database.status);

      // WhatsApp socket status
      expect(res.body).toHaveProperty('whatsapp');
      expect(res.body.whatsapp).toHaveProperty('instanceName', 'glow-studio-native');
      expect(res.body.whatsapp).toHaveProperty('status');
      expect(typeof res.body.whatsapp.hasQR).toBe('boolean');

      // System info
      expect(res.body).toHaveProperty('system');
      expect(res.body.system).toHaveProperty('nodeVersion');
      expect(res.body.system).toHaveProperty('platform');
    });
  });

  describe('POST /api/auth/login (Authentication Validation)', () => {
    it('should return 400 Bad Request when request body is empty or invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Credenciales inválidas');
    });

    it('should return 400 Bad Request when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-a-valid-email',
          password: 'secretPassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 Unauthorized when credentials do not exist', async () => {
      const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent-user-test-999@glowstudio.com',
          password: 'IncorrectPassword!123',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Credenciales inválidas');
      findUniqueSpy.mockRestore();
    });
  });

  describe('GET /api/admin/whatsapp/status (WhatsApp Native Status)', () => {
    it('should return 200 and WhatsApp socket connection status', async () => {
      const res = await request(app).get('/api/admin/whatsapp/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('configured', true);
      expect(res.body).toHaveProperty('instanceName', 'glow-studio-native');
      expect(res.body).toHaveProperty('state');
      expect(['connecting', 'open', 'close']).toContain(res.body.state);
      expect(res.body).toHaveProperty('hasQR');
    });
  });

  describe('404 Fallback Route Handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/unknown-endpoint-xyz');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Endpoint not found');
    });
  });
});
