// ============================================
// Glow Studio by Sofia — Express API Server
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';

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
import { instagramWebhookRouter } from './routes/webhooks/instagram';
import { whatsappWebhookRouter } from './routes/webhooks/whatsapp';
import { evolutionWebhookRouter } from './routes/webhooks/evolution';
import { requireAuth, requireAdmin } from './middleware/auth';
import { appointmentCreationLimiter, publicApiLimiter, webhookLimiter } from './middleware/rate-limit';
import { initCronJobs } from './services/cron';
import { prisma } from './services/prisma';
import { ensureAdminUserExists } from './services/seed-user';
import { initNativeWhatsApp } from './services/whatsapp-native';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Render reverse proxy for rate-limiter IP detection
app.set('trust proxy', 1);

// Middleware
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from Vercel, localhost, or no origin (mobile/curl)
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---- Webhooks (with high rate limit) ----
app.use('/api/webhooks/instagram', webhookLimiter, instagramWebhookRouter);
app.use('/api/webhooks/whatsapp', webhookLimiter, whatsappWebhookRouter);
app.use('/api/webhooks/evolution', webhookLimiter, evolutionWebhookRouter);

// ---- Authentication & Public Routes ----
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/services', publicApiLimiter, servicesRouter);
app.use('/api/gallery', publicApiLimiter, galleryRouter);
app.use('/api/appointments', appointmentCreationLimiter, appointmentsRouter);

// Protected Administrative Endpoints
app.use('/api/whatsapp-admin', whatsappAdminRouter);
app.use('/api/admin/whatsapp', whatsappAdminRouter);
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/messages', requireAuth, messagesRouter);
app.use('/api/admin', requireAdmin, adminRouter);
app.use('/api/analytics', requireAdmin, analyticsRouter);
app.use('/api/exports', requireAdmin, exportsRouter);


// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'glow-studio-api', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'glow-studio-api', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const server = app.listen(PORT, () => {
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
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Conexiones cerradas limpiamente.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
