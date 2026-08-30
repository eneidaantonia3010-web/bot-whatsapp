// ============================================
// Native In-App WhatsApp Management Routes
// ============================================

import { Router, Request, Response } from 'express';
import {
  getNativeStatus,
  getNativeQRBase64,
  getNativePairingCode,
  requestNativePairingCode,
  logoutNativeWhatsApp,
  sendNativeWhatsAppMessage,
} from '../services/whatsapp-native';

import { config } from '../config';

export const whatsappAdminRouter = Router();

const SALON_WHATSAPP = config.SALON_WHATSAPP;

// GET /api/admin/whatsapp/status — Check native connection state
whatsappAdminRouter.get('/status', (_req: Request, res: Response) => {
  const status = getNativeStatus();
  return res.json(status);
});

// POST /api/admin/whatsapp/pairing-code — Generate 8-digit Pairing Code for phone number
whatsappAdminRouter.post('/pairing-code', async (req: Request, res: Response) => {
  const phone = req.body.phone || SALON_WHATSAPP;
  if (!phone) {
    return res.status(400).json({ error: 'Número de teléfono es requerido' });
  }

  const code = await requestNativePairingCode(phone);
  if (code) {
    return res.json({
      status: 'ok',
      phone,
      pairingCode: code,
      message: `Ingresa este código en tu WhatsApp: ${code}`,
    });
  } else {
    return res.status(500).json({
      error: 'No se pudo generar el código de vinculación. Verifica que el socket no esté ya conectado.',
    });
  }
});

// POST /api/admin/whatsapp/init — Restart or logout native instance
whatsappAdminRouter.post('/init', async (_req: Request, res: Response) => {
  await logoutNativeWhatsApp();
  return res.json({
    message: 'Instancia nativa reinicializada en PostgreSQL',
    phone: SALON_WHATSAPP,
  });
});

// GET /api/admin/whatsapp/qr — Fetch live native QR code
whatsappAdminRouter.get('/qr', (_req: Request, res: Response) => {
  const qrBase64 = getNativeQRBase64();
  const status = getNativeStatus();

  if (_req.query.format === 'html') {
    res.setHeader('Content-Type', 'text/html');

    if (!qrBase64) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Vincular WhatsApp — Glow Studio</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #08080C; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
              .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); padding: 32px; border-radius: 24px; text-align: center; max-width: 420px; width: 100%; border: 1px solid rgba(255,255,255,0.1); }
              h1 { font-size: 22px; color: #fff; margin-bottom: 8px; font-weight: 600; }
              p { color: #aaa; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
              .status { display: inline-block; background: #10B981; color: #000; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 20px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>WhatsApp Conectado</h1>
              <p>El bot nativo de Glow Studio se encuentra <strong>100% ACTIVO y en línea</strong> en la base de datos PostgreSQL.</p>
              <div class="status">🟢 WhatsApp Conectado (+${SALON_WHATSAPP})</div>
            </div>
          </body>
        </html>
      `);
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vincular WhatsApp Nativo — Glow Studio</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #08080C; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(16px); padding: 32px; border-radius: 24px; text-align: center; max-width: 420px; width: 100%; border: 1px solid rgba(255,255,255,0.1); }
            h1 { font-size: 22px; color: #fff; margin-bottom: 8px; font-weight: 600; }
            p { color: #ccc; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
            img { width: 260px; height: 260px; border-radius: 16px; border: 4px solid #fff; box-shadow: 0 8px 32px rgba(217,70,239,0.3); margin-bottom: 20px; }
            .badge { display: inline-block; background: rgba(217,70,239,0.2); color: #f472b6; font-weight: 600; font-size: 12px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; border: 1px solid rgba(217,70,239,0.3); }
            .footer { font-size: 12px; color: #888; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Glow Studio Nativo (PostgreSQL)</div>
            <h1>Vincular WhatsApp Bot</h1>
            <p>Abrí WhatsApp en el celular <strong>+${SALON_WHATSAPP}</strong> &gt; Dispositivos vinculados &gt; Vincular dispositivo y escaneá este código QR.</p>
            <img src="${qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}" alt="WhatsApp QR Code" />
            <div class="footer">Almacenamiento permanente en PostgreSQL</div>
          </div>
        </body>
      </html>
    `);
  }

  return res.json({
    phone: SALON_WHATSAPP,
    qrBase64,
    status,
  });
});

// POST /api/admin/whatsapp/send — Send an outbound message (used for escalation and alerts)
whatsappAdminRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message fields are required' });
    }

    const success = await sendNativeWhatsAppMessage(to, message);
    if (success) {
      return res.json({ status: 'ok', sent: true });
    } else {
      return res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp message via admin endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

