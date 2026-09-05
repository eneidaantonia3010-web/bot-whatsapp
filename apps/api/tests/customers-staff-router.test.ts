import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/services/prisma';
import { config } from '../src/config';

describe('Customers & Staff Routes Integration Tests', () => {
  const adminApiKey = 'test-salon-api-secret-key-123';

  beforeEach(() => {
    vi.restoreAllMocks();
    (config as any).API_SECRET_KEY = adminApiKey;
  });

  describe('GET /api/customers', () => {
    it('should return paginated customer list', async () => {
      const mockCustomers = [
        {
          id: 'cust_1',
          name: 'Camila Perez',
          phone: '1144556677',
          email: 'camila@example.com',
          _count: { appointments: 3 },
        },
      ];

      vi.spyOn(prisma.customer, 'count').mockResolvedValueOnce(1);
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValueOnce(mockCustomers as any);

      const res = await request(app)
        .get('/api/customers?page=1&limit=10')
        .set('x-api-key', adminApiKey);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('should filter customers with search query', async () => {
      vi.spyOn(prisma.customer, 'count').mockResolvedValueOnce(0);
      vi.spyOn(prisma.customer, 'findMany').mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/customers?search=Camila')
        .set('x-api-key', adminApiKey);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should return 404 when customer is not found', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/customers/not_found')
        .set('x-api-key', adminApiKey);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Customer not found');
    });

    it('should return 200 with customer and appointment history', async () => {
      const mockCustomer = {
        id: 'cust_2',
        name: 'Lucia Alvarez',
        phone: '1199887766',
        appointments: [],
      };

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValueOnce(mockCustomer as any);

      const res = await request(app)
        .get('/api/customers/cust_2')
        .set('x-api-key', adminApiKey);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('cust_2');
      expect(res.body.name).toBe('Lucia Alvarez');
    });
  });

  describe('GET /api/staff', () => {
    it('should return active staff members list', async () => {
      const mockStaff = [
        {
          id: 'stf_1',
          name: 'Sofia Martinez',
          specialties: ['Colorimetría', 'Corte'],
          active: true,
        },
      ];

      vi.spyOn(prisma.staff, 'findMany').mockResolvedValueOnce(mockStaff as any);

      const res = await request(app).get('/api/staff');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe('Sofia Martinez');
    });
  });

  describe('POST /api/staff', () => {
    it('should reject unauthorized creation request without credentials', async () => {
      const res = await request(app)
        .post('/api/staff')
        .send({ name: 'Nueva Estilista' });

      expect(res.status).toBe(401);
    });

    it('should return 201 when admin creates a new staff member', async () => {
      const newStaff = {
        id: 'stf_new',
        name: 'Martina Gomez',
        email: 'martina@glowstudio.com',
        specialties: ['Peinados'],
        active: true,
      };

      vi.spyOn(prisma.staff, 'create').mockResolvedValueOnce(newStaff as any);

      const res = await request(app)
        .post('/api/staff')
        .set('x-api-key', adminApiKey)
        .send({
          name: 'Martina Gomez',
          email: 'martina@glowstudio.com',
          specialties: ['Peinados'],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('stf_new');
      expect(res.body.name).toBe('Martina Gomez');
    });
  });
});
