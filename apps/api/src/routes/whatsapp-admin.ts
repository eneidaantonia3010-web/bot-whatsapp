// ============================================
// Evolution API Instance Management Routes
// ============================================

import { Router, Request, Response } from 'express';

export const whatsappAdminRouter = Router();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'glow-studio-5491173566392';

const SALON_WHATSAPP = process.env.SALON_WHATSAPP || '5491173566392';

// GET /api/admin/whatsapp/status — Check instance connection state
whatsappAdminRouter.get('/status', async (_req: Request, res: Response) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return res.status(400).json({
      configured: false,
      error: 'Variables EVOLUTION_API_URL o EVOLUTION_API_KEY no definidas en .env',
      instanceName: INSTANCE_NAME,
      phone: SALON_WHATSAPP,
    });
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        configured: true,
        instanceName: INSTANCE_NAME,
        phone: SALON_WHATSAPP,
        status: 'not_found',
        error: errorText,
      });
    }

    const data = (await response.json()) as any;
    return res.json({
      configured: true,
      instanceName: INSTANCE_NAME,
      phone: SALON_WHATSAPP,
      state: data.instance?.state || data.state || 'unknown',
      data,
    });

  } catch (error: any) {
    console.error('Error fetching Evolution API connection status:', error);
    return res.status(500).json({ error: 'Error al conectar con Evolution API', message: error.message });
  }
});

// POST /api/admin/whatsapp/init — Create or configure Evolution API instance with Webhook
whatsappAdminRouter.post('/init', async (req: Request, res: Response) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return res.status(400).json({ error: 'Faltan variables EVOLUTION_API_URL o EVOLUTION_API_KEY' });
  }

  const host = req.get('host') || 'glow-studio-api.onrender.com';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const webhookUrl = `${protocol}://${host}/api/webhooks/evolution`;

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        integration: 'WHATSAPP-BAILEYS',
        number: SALON_WHATSAPP,
        qrcode: true,
        rejectCall: true,
        msgCall: 'Hola! En Glow Studio respondemos únicamente por mensajes de WhatsApp 💕',
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: true,
        readStatus: false,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
      }),
    });

    const data = await response.json();
    return res.json({
      message: 'Instancia inicializada en Evolution API',
      instanceName: INSTANCE_NAME,
      phone: SALON_WHATSAPP,
      webhookUrl,
      result: data,
    });
  } catch (error: any) {
    console.error('Error initializing Evolution instance:', error);
    return res.status(500).json({ error: 'Error al crear la instancia en Evolution API', message: error.message });
  }
});

// GET /api/admin/whatsapp/qr — Fetch QR code to scan with phone
whatsappAdminRouter.get('/qr', async (_req: Request, res: Response) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return res.status(400).json({ error: 'Variables EVOLUTION_API_URL o EVOLUTION_API_KEY no configuradas' });
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'No se pudo obtener el QR. Verificá si la instancia existe.',
        details: errorText,
      });
    }

    const data = (await response.json()) as any;
    const qrBase64 = data.base64 || data.qrcode?.base64 || data.code;


    if (_req.query.format === 'html' && qrBase64) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!Valid HTML QR Display>
        <html>
          <head>
            <title>Vincular WhatsApp — Glow Studio</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf8f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
              .card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); text-align: center; max-width: 420px; width: 100%; border: 1px solid #f0e6df; }
              h1 { font-size: 22px; color: #1a1a1a; margin-bottom: 8px; font-weight: 600; }
              p { color: #666; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
              img { width: 260px; height: 260px; border-radius: 16px; border: 4px solid #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .badge { display: inline-block; background: #fdf2f4; color: #d946ef; font-weight: 600; font-size: 12px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; }
              .footer { font-size: 12px; color: #888; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">Glow Studio by Sofia</div>
              <h1>Vincular WhatsApp Bot</h1>
              <p>Abrí WhatsApp en el celular <strong>+${SALON_WHATSAPP}</strong> &gt; Dispositivos vinculados &gt; Vincular dispositivo y escaneá este código QR.</p>
              <img src="${qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}" alt="WhatsApp QR Code" />
              <div class="footer">Instancia: <strong>${INSTANCE_NAME}</strong></div>
            </div>
          </body>
        </html>
      `);
    }

    return res.json({
      instanceName: INSTANCE_NAME,
      phone: SALON_WHATSAPP,
      qrBase64,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching QR from Evolution API:', error);
    return res.status(500).json({ error: 'Error al conectar con Evolution API', message: error.message });
  }
});
