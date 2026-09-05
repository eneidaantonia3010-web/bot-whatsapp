import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/services/prisma';
import { config } from '../src/config';

describe('Appointments Router & Service Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (config as any).API_SECRET_KEY = 'test-salon-api-secret-key-123';
  });

  describe('GET /api/appointments/by-token/:token', () => {
    it('should return 200 and masked customer phone when appointment exists', async () => {
      const mockAppointment = {
        id: 'apt_123',
        token: 'tok_abc',
        date: new Date('2026-09-10T14:00:00.000Z'),
        endDate: new Date('2026-09-10T14:45:00.000Z'),
        status: 'CONFIRMED',
        customer: {
          id: 'cust_1',
          name: 'Florencia Gomez',
          phone: '5491112345678',
        },
        service: {
          id: 'srv_1',
          name: 'Corte y Lavado',
          price: 18000,
          duration: 45,
        },
        staff: null,
      };

      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce(mockAppointment as any);

      const res = await request(app).get('/api/appointments/by-token/tok_abc');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('apt_123');
      expect(res.body.customer.name).toBe('Florencia Gomez');
      expect(res.body.customer.phone).toContain('****');
    });

    it('should return 404 when appointment token is not found', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app).get('/api/appointments/by-token/invalid_token');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Turno no encontrado');
    });
  });

  describe('POST /api/appointments/by-token/:token/reschedule', () => {
    it('should return 400 when newDate is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/appointments/by-token/tok_abc/reschedule')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('newDate es requerida');
    });

    it('should return 404 if appointment token does not exist', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments/by-token/tok_not_found/reschedule')
        .send({ newDate: '2026-09-15T15:00:00.000Z' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Turno no encontrado');
    });

    it('should return 400 when attempting to reschedule a CANCELLED appointment', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce({
        id: 'apt_cancelled',
        token: 'tok_cancelled',
        status: 'CANCELLED',
        service: { duration: 30 },
      } as any);

      const res = await request(app)
        .post('/api/appointments/by-token/tok_cancelled/reschedule')
        .send({ newDate: '2026-09-15T15:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No se puede reprogramar un turno cancelado');
    });

    it('should return 200 with updated appointment when reschedule succeeds', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce({
        id: 'apt_active',
        token: 'tok_active',
        status: 'PENDING',
        service: { duration: 60 },
        staffId: null,
      } as any);

      const updatedApt = {
        id: 'apt_active',
        token: 'tok_active',
        date: '2026-09-15T15:00:00.000Z',
        endDate: '2026-09-15T16:00:00.000Z',
        status: 'CONFIRMED',
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          $executeRaw: vi.fn().mockResolvedValueOnce(1),
          appointment: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
            update: vi.fn().mockResolvedValueOnce(updatedApt),
          },
          blockedTime: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
          },
        };
        return callback(mockTx);
      });

      const res = await request(app)
        .post('/api/appointments/by-token/tok_active/reschedule')
        .send({ newDate: '2026-09-15T15:00:00.000Z' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CONFIRMED');
    });
  });

  describe('POST /api/appointments/by-token/:token/cancel', () => {
    it('should return 404 when cancelling non-existent token', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments/by-token/unknown_tok/cancel')
        .send({ reason: 'Imprevisto laboral' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Turno no encontrado');
    });

    it('should return 200 and set status to CANCELLED', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce({
        id: 'apt_cancel_ok',
        token: 'tok_cancel_ok',
        status: 'CONFIRMED',
        calendarEventId: null,
        notes: null,
      } as any);

      vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({
        id: 'apt_cancel_ok',
        status: 'CANCELLED',
        notes: 'Cancelado por cliente: Viaje',
      } as any);

      const res = await request(app)
        .post('/api/appointments/by-token/tok_cancel_ok/cancel')
        .send({ reason: 'Viaje' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });
  });

  describe('GET /api/appointments/availability', () => {
    it('should return 400 if date or serviceId are missing', async () => {
      const res = await request(app).get('/api/appointments/availability');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('date and serviceId are required');
    });

    it('should return 400 if service does not exist', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app).get('/api/appointments/availability?date=2026-09-10&serviceId=missing');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/service not found/i);
    });

    it('should return 200 with calculated slots array when valid', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValueOnce({
        id: 'srv_1',
        name: 'Manicura',
        duration: 30,
      } as any);

      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.blockedTime, 'findMany').mockResolvedValueOnce([]);

      const res = await request(app).get('/api/appointments/availability?date=2026-09-10&serviceId=srv_1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('time');
      expect(res.body[0]).toHaveProperty('available');
    });
  });

  describe('POST /api/appointments (Creation)', () => {
    it('should return 400 when body fails Zod schema validation', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({ customerName: 'A' }); // missing date, serviceId, phone

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos de reserva inválidos');
    });

    it('should return 400 if serviceId is invalid/not found', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          date: '2026-09-20T14:00:00.000Z',
          serviceId: 'srv_invalid',
          customerName: 'Valeria Rossi',
          customerPhone: '1122334455',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Service not found');
    });

    it('should return 201 and created appointment on valid payload', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValueOnce({
        id: 'srv_valid',
        name: 'Balayage',
        duration: 90,
        price: 45000,
      } as any);

      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce({
        id: 'cust_existing',
        name: 'Valeria Rossi',
        phone: '1122334455',
      } as any);

      const createdApt = {
        id: 'apt_created_123',
        status: 'PENDING',
        date: '2026-09-20T14:00:00.000Z',
        endDate: '2026-09-20T15:30:00.000Z',
        serviceId: 'srv_valid',
        customerId: 'cust_existing',
        customer: { name: 'Valeria Rossi', phone: '1122334455' },
        service: { name: 'Balayage', price: 45000 },
      };

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          $executeRaw: vi.fn().mockResolvedValueOnce(1),
          appointment: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
            create: vi.fn().mockResolvedValueOnce(createdApt),
          },
          blockedTime: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
          },
        };
        return callback(mockTx);
      });

      vi.spyOn(prisma.waitlist, 'findFirst').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          date: '2026-09-20T14:00:00.000Z',
          serviceId: 'srv_valid',
          customerName: 'Valeria Rossi',
          customerPhone: '1122334455',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('apt_created_123');
      expect(res.body.status).toBe('PENDING');
    });
  });

  describe('GET /api/appointments/customer/upcoming', () => {
    it('should return 400 when neither phone nor instagram is passed', async () => {
      const res = await request(app)
        .get('/api/appointments/customer/upcoming')
        .set('x-api-key', 'test-salon-api-secret-key-123');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('phone or instagram is required');
    });

    it('should return empty list when customer is not found', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/appointments/customer/upcoming?phone=1122334455')
        .set('x-api-key', 'test-salon-api-secret-key-123');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return upcoming active appointments', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce({
        id: 'cust_up',
        name: 'Maria Paz',
      } as any);

      const mockAppointments = [
        {
          id: 'apt_up_1',
          date: new Date('2026-09-12T14:00:00.000Z'),
          status: 'CONFIRMED',
          service: { name: 'Peinado' },
          customer: { name: 'Maria Paz' },
        },
      ];

      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValueOnce(mockAppointments as any);

      const res = await request(app)
        .get('/api/appointments/customer/upcoming?phone=1122334455')
        .set('x-api-key', 'test-salon-api-secret-key-123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('apt_up_1');
    });
  });

  describe('POST /api/appointments/confirm-upcoming', () => {
    it('should return 400 if phone or instagram missing', async () => {
      const res = await request(app)
        .post('/api/appointments/confirm-upcoming')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 if no pending appointment found', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce({ id: 'cust_1' } as any);
      vi.spyOn(prisma.appointment, 'findFirst').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments/confirm-upcoming')
        .send({ phone: '1122334455' });

      expect(res.status).toBe(404);
    });

    it('should confirm appointment and return 200', async () => {
      vi.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce({ id: 'cust_1' } as any);
      vi.spyOn(prisma.appointment, 'findFirst').mockResolvedValueOnce({ id: 'apt_pend_1' } as any);
      vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({
        id: 'apt_pend_1',
        status: 'CONFIRMED',
      } as any);

      const res = await request(app)
        .post('/api/appointments/confirm-upcoming')
        .send({ phone: '1122334455' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CONFIRMED');
    });
  });

  describe('POST /api/appointments/:id/cancel', () => {
    it('should return 404 when appointment does not exist', async () => {
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments/apt_missing/cancel')
        .set('x-api-key', 'test-salon-api-secret-key-123')
        .send({ reason: 'Personal' });

      expect(res.status).toBe(404);
    });

    it('should cancel appointment and check late cancellation (< 4 hours)', async () => {
      const aptDateIn2Hours = new Date(Date.now() + 2 * 60 * 60 * 1000);
      vi.spyOn(prisma.appointment, 'findUnique').mockResolvedValueOnce({
        id: 'apt_late',
        date: aptDateIn2Hours,
        serviceId: 'srv_1',
        customerId: 'cust_1',
        calendarEventId: null,
      } as any);

      vi.spyOn(prisma.customer, 'update').mockResolvedValueOnce({} as any);
      vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({
        id: 'apt_late',
        status: 'CANCELLED',
        lateCancellation: true,
      } as any);
      vi.spyOn(prisma.waitlist, 'findFirst').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/appointments/apt_late/cancel')
        .set('x-api-key', 'test-salon-api-secret-key-123')
        .send({ reason: 'Imprevisto' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.lateCancellation).toBe(true);
    });
  });

  describe('GET /api/appointments (Admin List)', () => {
    it('should return appointment list for admin', async () => {
      const mockList = [
        { id: 'apt_adm_1', status: 'CONFIRMED', service: { name: 'Corte' }, customer: { name: 'Ana' } },
      ];
      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValueOnce(mockList as any);

      const res = await request(app)
        .get('/api/appointments')
        .set('x-api-key', 'test-salon-api-secret-key-123');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('PATCH /api/appointments/:id', () => {
    it('should update appointment status', async () => {
      vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({
        id: 'apt_upd',
        status: 'COMPLETED',
        notes: 'Finalizado con éxito',
      } as any);

      const res = await request(app)
        .patch('/api/appointments/apt_upd')
        .set('x-api-key', 'test-salon-api-secret-key-123')
        .send({ status: 'COMPLETED', notes: 'Finalizado con éxito' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });
  });
});
