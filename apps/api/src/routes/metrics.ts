// ============================================
// Metrics & Observability Route
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { getNativeStatus } from '../services/whatsapp-native';
import { config } from '../config';

export const metricsRouter = Router();

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export async function getSystemMetrics() {
  const uptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  // 1. Measure DB ping & status
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;
  let dbError: string | undefined;

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'disconnected';
    dbError = err?.message || 'Database unreachable';
  }

  // 2. Query native WhatsApp socket status
  let whatsappStatus: ReturnType<typeof getNativeStatus>;
  try {
    whatsappStatus = getNativeStatus();
  } catch (err: any) {
    whatsappStatus = {
      configured: false,
      instanceName: 'glow-studio-native',
      phone: config.SALON_WHATSAPP,
      state: 'close',
      hasQR: false,
      pairingCode: null,
    };
  }

  const isHealthy = dbStatus === 'connected';

  return {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'glow-studio-api',
    version: '1.0.0',
    environment: config.NODE_ENV || process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rssMb: Number((memUsage.rss / (1024 * 1024)).toFixed(2)),
      heapUsedMb: Number((memUsage.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((memUsage.heapTotal / (1024 * 1024)).toFixed(2)),
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
    whatsapp: {
      status: whatsappStatus.state,
      configured: whatsappStatus.configured,
      instanceName: whatsappStatus.instanceName,
      phone: whatsappStatus.phone,
      hasQR: whatsappStatus.hasQR,
      hasPairingCode: !!whatsappStatus.pairingCode,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    },
  };
}

// GET /api/metrics (or /)
metricsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const metrics = await getSystemMetrics();
    return res.json(metrics);
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Error recolectando métricas del sistema',
      error: error?.message,
    });
  }
});
