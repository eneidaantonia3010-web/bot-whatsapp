// ============================================
// Glow Studio by Sofia — Express API Server
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.local' });

import { servicesRouter } from './routes/services';
import { appointmentsRouter } from './routes/appointments';
import { customersRouter } from './routes/customers';
import { galleryRouter } from './routes/gallery';
import { messagesRouter } from './routes/messages';
import { adminRouter } from './routes/admin';
import { analyticsRouter } from './routes/analytics';
import { exportsRouter } from './routes/exports';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { whatsappAdminRouter } from './routes/whatsapp-admin';
import { blockedTimesRouter } from './routes/blocked-times';
import { waitlistRouter } from './routes/waitlist';
import { staffRouter } from './routes/staff';
import { realtimeRouter } from './routes/realtime';
import { metricsRouter } from './routes/metrics';
import { instagramWebhookRouter } from './routes/webhooks/instagram';
import { requireAuth, requireAdmin } from './middleware/auth';
import { appointmentCreationLimiter, publicApiLimiter, webhookLimiter } from './middleware/rate-limit';
import { initCronJobs } from './services/cron';
import { prisma } from './services/prisma';
import { ensureAdminUserExists } from './services/seed-user';
import { initNativeWhatsApp } from './services/whatsapp-native';
import { logger } from './services/logger';
import { config } from './config';

// Global error traps to prevent node process death
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception in Node Runtime');
});

const app = express();
const PORT = config.PORT;

// Trust Render reverse proxy for rate-limiter IP detection
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin === config.FRONTEND_URL) return callback(null, true);
    if (/^https:\/\/glow-studio[a-zA-Z0-9-]*\.(onrender\.com|vercel\.app)$/.test(origin)) return callback(null, true);
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Request logging via structured logger
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming HTTP Request');
  next();
});

// ---- Webhooks (with high rate limit) ----
// WhatsApp es 100% nativo (Baileys embebido en whatsapp-native.ts); no hay webhooks de WhatsApp.
app.use('/api/webhooks/instagram', webhookLimiter, instagramWebhookRouter);

// ---- Authentication & Public Routes ----
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/staff', staffRouter);
app.use('/api/realtime', requireAuth, realtimeRouter);
app.use('/api/services', publicApiLimiter, servicesRouter);
app.use('/api/gallery', publicApiLimiter, galleryRouter);
app.use('/api/appointments', publicApiLimiter, appointmentsRouter);
app.use('/api/blocked-times', blockedTimesRouter);
app.use('/api/waitlist', waitlistRouter);

// WhatsApp Management Endpoints (GET /qr and /status are public/viewable; POST actions protected inside router)
app.use('/api/whatsapp-admin', whatsappAdminRouter);
app.use('/api/admin/whatsapp', whatsappAdminRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/messages', publicApiLimiter, messagesRouter);
app.use('/api/admin', requireAdmin, adminRouter);
app.use('/api/analytics', requireAdmin, analyticsRouter);
app.use('/api/exports', requireAdmin, exportsRouter);


// Deep Health check
app.get('/', async (_req, res) => {
  res.json({ status: 'ok', service: 'glow-studio-api', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'glow-studio-api',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      service: 'glow-studio-api',
      database: 'disconnected',
      error: error?.message || 'Database unreachable',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Error:', err.message);
  // Do not expose err.message in production unless it's a known safe error
  const message = process.env.NODE_ENV === 'production' ? 'Ocurrió un error en el servidor.' : err.message;
  res.status(500).json({ error: 'Internal server error', message });
});

// Start server (only when not in test environment)
let server: ReturnType<typeof app.listen> | null = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n✨ Glow Studio API running on port ${PORT}`);
    
    // Seed admin user if needed
    ensureAdminUserExists();

    // Initialize scheduled tasks
    initCronJobs();

    // Initialize Native In-App Baileys WhatsApp Service
    initNativeWhatsApp();
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\n🔌 Recibida señal ${signal}. Cerrando servidor API y desconectando Prisma...`);
    if (server) {
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✅ Conexiones cerradas limpiamente.');
        process.exit(0);
      });
    } else {
      await prisma.$disconnect();
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export { app };
export default app;

