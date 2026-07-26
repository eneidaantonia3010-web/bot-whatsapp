// ============================================
// Glow Studio by Sofia — Express API Server
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { servicesRouter } from './routes/services';
import { appointmentsRouter } from './routes/appointments';
import { customersRouter } from './routes/customers';
import { galleryRouter } from './routes/gallery';
import { messagesRouter } from './routes/messages';
import { adminRouter } from './routes/admin';
import { instagramWebhookRouter } from './routes/webhooks/instagram';
import { whatsappWebhookRouter } from './routes/webhooks/whatsapp';
import { evolutionWebhookRouter } from './routes/webhooks/evolution';
import { requireAuth, requireAdmin } from './middleware/auth';
import { appointmentCreationLimiter, publicApiLimiter, webhookLimiter } from './middleware/rate-limit';
import { initCronJobs } from './services/cron';
import { prisma } from './services/prisma';


import compression from 'compression';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

import { analyticsRouter } from './routes/analytics';
import { exportsRouter } from './routes/exports';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { whatsappAdminRouter } from './routes/whatsapp-admin';
import { ensureAdminUserExists } from './services/seed-user';

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
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/messages', requireAuth, messagesRouter);
app.use('/api/admin/whatsapp', whatsappAdminRouter);
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


// 404
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
  console.log(`\n✨ Glow Studio API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  
  // Seed admin user if needed
  ensureAdminUserExists();

  // Initialize scheduled tasks
  initCronJobs();
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

