// ============================================
// Messages Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

export const messagesRouter = Router();

// GET /api/messages — List message logs
messagesRouter.get('/', async (req: Request, res: Response) => {
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
    const BOT_URL = process.env.BOT_URL || 'http://localhost:8000';

    try {
      const aiResponse = await fetch(`${BOT_URL}/process-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sender_id: senderId, platform }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json() as { response: string };
        botResponse = data.response;
      }
    } catch {
      // Bot service not available, use fallback
      botResponse = '¡Gracias por tu mensaje! ✨ Nuestro equipo te responderá pronto. También podés llamarnos al +54 11 5555-4444.';
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
