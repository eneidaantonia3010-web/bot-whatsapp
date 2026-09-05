// ============================================
// Unit & Integration Tests: Cron Reminders & Evolution Webhook
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/services/prisma';
import { runDailyConfirmationJob } from '../src/services/cron';
import { processEvolutionMessage } from '../src/routes/webhooks/evolution';
import * as whatsappService from '../src/services/whatsapp';

describe('Cron Reminders & Evolution API Webhook Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('runDailyConfirmationJob', () => {
    it('should find pending appointments for today and send confirmation requests', async () => {
      const mockAppointments = [
        {
          id: 'apt_123',
          date: new Date('2026-09-05T15:00:00.000Z'),
          status: 'PENDING',
          customer: {
            id: 'cust_1',
            name: 'Valeria Gomez',
            phone: '5491198765432',
          },
          service: {
            id: 'srv_1',
            name: 'Corte Signature',
          },
        },
      ];

      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValueOnce(mockAppointments as any);
      vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({ id: 'apt_123' } as any);
      vi.spyOn(whatsappService, 'sendCustomerConfirmationRequest').mockResolvedValueOnce(true);

      const count = await runDailyConfirmationJob();
      expect(count).toBe(1);
      expect(whatsappService.sendCustomerConfirmationRequest).toHaveBeenCalledTimes(1);
      expect(whatsappService.sendCustomerConfirmationRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          customerPhone: '5491198765432',
          customerName: 'Valeria Gomez',
          serviceName: 'Corte Signature',
        })
      );
    });

    it('should return 0 when there are no pending appointments', async () => {
      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValueOnce([]);
      const count = await runDailyConfirmationJob();
      expect(count).toBe(0);
    });
  });

  describe('processEvolutionMessage (Yes/No Confirmation Processing)', () => {
    it('should confirm appointment when client answers "SÍ"', async () => {
      const mockApt = {
        id: 'apt_conf_1',
        date: new Date('2026-09-05T18:00:00.000Z'),
        status: 'PENDING',
        customer: { name: 'Lucia Diaz', phone: '5491112345678' },
        service: { name: 'Esmaltado Semi Pro' },
      };

      vi.spyOn(prisma.appointment, 'findFirst').mockResolvedValueOnce(mockApt as any);
      const updateSpy = vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({ ...mockApt, status: 'CONFIRMED' } as any);
      vi.spyOn(whatsappService, 'sendWhatsAppMessage').mockResolvedValueOnce(true);

      const payload = {
        data: {
          key: { remoteJid: '5491112345678@s.whatsapp.net', fromMe: false },
          message: { conversation: 'Sí, confirmo!' },
        },
      };

      const result = await processEvolutionMessage(payload);
      expect(result.status).toBe('confirmed');
      expect(result.detail).toBe('apt_conf_1');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt_conf_1' },
          data: { status: 'CONFIRMED' },
        })
      );
    });

    it('should cancel appointment when client answers "NO"', async () => {
      const mockApt = {
        id: 'apt_canc_1',
        date: new Date('2026-09-05T18:00:00.000Z'),
        status: 'PENDING',
        notes: '',
        customer: { name: 'Lucia Diaz', phone: '5491112345678' },
        service: { name: 'Esmaltado Semi Pro' },
      };

      vi.spyOn(prisma.appointment, 'findFirst').mockResolvedValueOnce(mockApt as any);
      const updateSpy = vi.spyOn(prisma.appointment, 'update').mockResolvedValueOnce({ ...mockApt, status: 'CANCELLED' } as any);
      vi.spyOn(whatsappService, 'sendWhatsAppMessage').mockResolvedValueOnce(true);

      const payload = {
        data: {
          key: { remoteJid: '5491112345678@s.whatsapp.net', fromMe: false },
          message: { conversation: 'No puedo asistir, cancelo' },
        },
      };

      const result = await processEvolutionMessage(payload);
      expect(result.status).toBe('cancelled');
      expect(result.detail).toBe('apt_canc_1');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt_canc_1' },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        })
      );
    });
  });

  describe('POST /api/webhooks/evolution', () => {
    it('should accept incoming webhook and return 200 OK', async () => {
      vi.spyOn(prisma.appointment, 'findFirst').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/webhooks/evolution')
        .send({
          data: {
            key: { remoteJid: '5491112345678@s.whatsapp.net', fromMe: false },
            message: { conversation: 'Hola' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('result');
    });
  });
});
