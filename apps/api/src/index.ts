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
import { initCronJobs } from './services/cron';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
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

// ---- Routes ----
app.use('/api/services', servicesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks/instagram', instagramWebhookRouter);
app.use('/api/webhooks/whatsapp', whatsappWebhookRouter);

// Health check
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
app.listen(PORT, () => {
  console.log(`\n✨ Glow Studio API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  
  // Initialize scheduled tasks
  initCronJobs();
});

export default app;
