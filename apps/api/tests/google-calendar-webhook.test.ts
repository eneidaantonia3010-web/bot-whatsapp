// ============================================
// Tests for Google Calendar Webhook Sync
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/services/prisma';
import { processGoogleCalendarNotification } from '../src/routes/webhooks/google-calendar';
import * as calendarService from '../src/services/calendar';

describe('Google Calendar Webhook Sync Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('processGoogleCalendarNotification', () => {
    it('should acknowledge Google Calendar handshake verification', async () => {
      const headers = { 'x-goog-resource-state': 'sync' };
      const res = await processGoogleCalendarNotification(headers, {});
      expect(res.status).toBe('handshake_acknowledged');
    });

    it('should create BlockedTime in PostgreSQL when direct event payload is received', async () => {
      const payload = {
        event: {
          startDate: '2026-09-10T14:00:00.000Z',
          endDate: '2026-09-10T17:00:00.000Z',
          summary: 'Capacitación L’Oréal Staff',
        },
      };

      vi.spyOn(prisma.blockedTime, 'findFirst').mockResolvedValueOnce(null);
      const createSpy = vi.spyOn(prisma.blockedTime, 'create').mockResolvedValueOnce({
        id: 'block_1',
        startDate: new Date(payload.event.startDate),
        endDate: new Date(payload.event.endDate),
        reason: payload.event.summary,
        allDay: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await processGoogleCalendarNotification({}, payload);
      expect(res.status).toBe('blocked_time_created');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Capacitación L’Oréal Staff',
          }),
        })
      );
    });

    it('should trigger syncExternalEventsToBlockedTimes on Google push notification', async () => {
      const headers = { 'x-goog-resource-state': 'exists' };
      vi.spyOn(calendarService, 'syncExternalEventsToBlockedTimes').mockResolvedValueOnce(2);

      const res = await processGoogleCalendarNotification(headers, {});
      expect(res.status).toBe('sync_completed');
      expect(res.synced).toBe(2);
    });
  });

  describe('POST /api/webhooks/google-calendar', () => {
    it('should return 200 OK and handle incoming webhook notification', async () => {
      const res = await request(app)
        .post('/api/webhooks/google-calendar')
        .set('x-goog-resource-state', 'sync')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.result).toHaveProperty('status', 'handshake_acknowledged');
    });
  });
});
