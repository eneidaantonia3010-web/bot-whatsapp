// ============================================
// Real-Time Events Engine (Server-Sent Events)
// ============================================

import { Router, Request, Response } from 'express';
import { logger } from '../services/logger';

export const realtimeRouter = Router();

type Client = {
  id: string;
  res: Response;
};

let clients: Client[] = [];

// GET /api/realtime/events — SSE Stream for Admin Dashboard & Live Updates
realtimeRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx/Render)
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newClient: Client = { id: clientId, res };
  clients.push(newClient);

  logger.info({ clientId, activeClients: clients.length }, '📡 Realtime SSE Client connected');

  // Send initial ping to confirm stream open
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat ping every 25 seconds to keep connection alive across proxies
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter((c) => c.id !== clientId);
    logger.info({ clientId, remainingClients: clients.length }, '📡 Realtime SSE Client disconnected');
  });
});

export type RealtimeEvent = {
  type: 'APPOINTMENT_CREATED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_RESCHEDULED' | 'WHATSAPP_STATUS';
  payload: any;
  timestamp?: string;
};

/**
 * Broadcast an event to all connected admin clients in real-time
 */
export function broadcastRealtimeEvent(event: RealtimeEvent) {
  if (clients.length === 0) return;

  const data = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });

  clients.forEach((client) => {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (err) {
      logger.warn({ clientId: client.id, err }, 'Failed to write SSE event to client');
    }
  });

  logger.debug({ eventType: event.type, recipientCount: clients.length }, '📢 Broadcasted realtime event');
}
