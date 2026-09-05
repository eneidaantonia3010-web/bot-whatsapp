// ============================================
// Messages Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';

export const messagesRouter = Router();

// GET /api/messages — List message logs (requires admin auth)
messagesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { platform, senderId, limit = '50' } = req.query;

    const where: any = {};
    if (platform) where.platform = platform;
    if (senderId) where.senderId = senderId;

    const messages = await prisma.messageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: { customer: true },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages — Send a message (from web chatbot)
messagesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { message, senderId, platform = 'WEB' } = req.body;

    // Save inbound message
    const inbound = await prisma.messageLog.create({
      data: {
        platform,
        senderId,
        message,
        direction: 'INBOUND',
      },
    });

    // For web chatbot, try to get AI response from the bot service
    let botResponse = '';

    try {
      const primaryBotUrl = (config.BOT_URL || 'https://glow-studio-bot-alrb.onrender.com').replace(/\/$/, '');
      const fallbackBotUrl = 'https://glow-studio-bot-alrb.onrender.com';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const requestHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': config.API_SECRET_KEY,
        'x-bot-key': 'glow-studio-internal-secret-2026',
      };
      const requestBody = JSON.stringify({ message, sender_id: senderId, platform });

      let aiResponse: globalThis.Response | null = null;
      try {
        aiResponse = await fetch(`${primaryBotUrl}/process-message`, {
          method: 'POST',
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        });

        if (!aiResponse.ok && (aiResponse.status === 404 || aiResponse.status >= 500) && primaryBotUrl !== fallbackBotUrl) {
          aiResponse = await fetch(`${fallbackBotUrl}/process-message`, {
            method: 'POST',
            headers: requestHeaders,
            body: requestBody,
            signal: controller.signal,
          });
        }
      } finally {
        clearTimeout(timeout);
      }

      if (aiResponse && aiResponse.ok) {
        const data = await aiResponse.json() as { response: string };
        botResponse = data.response;
      }
    } catch (fetchErr: any) {
      console.warn('⚠️ Web message bot error:', fetchErr?.message);
    }

    if (!botResponse || !botResponse.trim()) {
      // Bot service not available or returned non-200, use graceful fallback
      botResponse = `¡Hola! Gracias por tu mensaje 💕 En este momento estamos procesando tu solicitud. Podés consultar nuestros servicios o escribirnos directamente a nuestro WhatsApp al +${config.SALON_WHATSAPP} ✨`;
    }

    // Save outbound response
    if (botResponse) {
      await prisma.messageLog.create({
        data: {
          platform,
          senderId,
          message: botResponse,
          direction: 'OUTBOUND',
        },
      });
    }

    res.json({ response: botResponse });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});
