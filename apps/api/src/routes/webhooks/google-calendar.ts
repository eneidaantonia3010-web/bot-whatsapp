// ============================================
// Google Calendar Webhook Receiver
// Syncs external calendar events directly into PostgreSQL BlockedTime
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { syncExternalEventsToBlockedTimes, invalidateFreeBusyCache } from '../../services/calendar';

export const googleCalendarWebhookRouter = Router();

export async function processGoogleCalendarNotification(
  headers: Record<string, any>,
  body: any
): Promise<{ status: string; synced?: number; details?: any }> {
  const resourceState = headers['x-goog-resource-state'] || headers['X-Goog-Resource-State'];

  // 1. Initial Google Calendar handshake verification
  if (resourceState === 'sync') {
    return { status: 'handshake_acknowledged' };
  }

  // 2. Direct event payload (from calendar automation / webhook relay)
  const event = body?.event || body;
  const startRaw = event?.startDate || event?.start?.dateTime || event?.start?.date;
  const endRaw = event?.endDate || event?.end?.dateTime || event?.end?.date;
  const summary = event?.summary || event?.reason || 'Bloqueo externo Google Calendar';

  if (startRaw && endRaw) {
    const startDate = new Date(startRaw);
    const endDate = new Date(endRaw);

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
      // Check if already blocked to avoid duplicates
      const existing = await prisma.blockedTime.findFirst({
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          reason: summary,
        },
      });

      if (!existing) {
        const blocked = await prisma.blockedTime.create({
          data: {
            startDate,
            endDate,
            reason: summary,
            allDay: !event?.start?.dateTime,
          },
        });
        invalidateFreeBusyCache();
        return { status: 'blocked_time_created', details: blocked };
      }
      return { status: 'already_exists' };
    }
  }

  // 3. Google Calendar Push Notification (Trigger full external sync)
  const synced = await syncExternalEventsToBlockedTimes();
  return { status: 'sync_completed', synced };
}

// POST /api/webhooks/google-calendar
googleCalendarWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const result = await processGoogleCalendarNotification(req.headers, req.body);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('❌ Google Calendar webhook error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/webhooks/google-calendar/sync (Manual/Cron sync trigger)
googleCalendarWebhookRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    const synced = await syncExternalEventsToBlockedTimes();
    return res.json({ success: true, synced });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
