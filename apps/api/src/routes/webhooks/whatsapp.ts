// ============================================
// WhatsApp Webhook Routes (Meta Cloud API)
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { sendWhatsAppMessage } from '../../services/whatsapp';

export const whatsappWebhookRouter = Router();

const BOT_URL = process.env.BOT_URL || 'http://localhost:8000';
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || '';

// GET — Webhook verification (Meta challenge)
whatsappWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Meta WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Meta WhatsApp webhook verification failed');
  res.status(403).send('Verification failed');
});

// POST — Receive WhatsApp messages from Meta
whatsappWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Quick 200 response to Meta to prevent retries
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue;

          const value = change.value;
          const messages = value?.messages || [];
          const contacts = value?.contacts || [];

          for (const msg of messages) {
            // Ignore system messages, statuses, etc. Only process text messages.
            if (msg.type !== 'text') continue;

            const senderId = msg.from;
            const senderName = contacts.find((c: any) => c.wa_id === senderId)?.profile?.name || null;
            const messageText = msg.text?.body;

            if (!senderId || !messageText) continue;

            console.log(`📩 WA (Meta) from ${senderId} (${senderName}): ${messageText}`);

            // Save inbound message to DB
            await prisma.messageLog.create({
              data: {
                platform: 'WHATSAPP',
                senderId,
                senderName,
                message: messageText,
                direction: 'INBOUND',
              },
            });
            
            // Forward to AI Bot
            try {
              const agentResponse = await fetch(`${BOT_URL}/process-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: messageText,
                  sender_id: senderId,
                  platform: 'WHATSAPP',
                }),
              });
              
              if (agentResponse.ok) {
                 const data = await agentResponse.json() as { response: string };
                 const reply = data.response;
                 
                 // Save outbound response to DB
                 await prisma.messageLog.create({
                   data: {
                     platform: 'WHATSAPP',
                     senderId,
                     message: reply,
                     direction: 'OUTBOUND',
                   },
                 });
                 
                 // Send back via Meta Graph API
                 await sendWhatsAppMessage({ to: senderId, message: reply });
              }
            } catch (error) {
              console.error('❌ Error processing WA message with bot:', error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Meta WhatsApp webhook error:', error);
  }
});
