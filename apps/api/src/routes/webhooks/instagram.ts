// ============================================
// Instagram Webhook Routes (Meta)
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';

export const instagramWebhookRouter = Router();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.WEBHOOK_VERIFY_TOKEN || '';
const BOT_URL = process.env.BOT_URL || 'http://localhost:8000';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';

// GET — Webhook verification (Meta challenge)
instagramWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Instagram webhook verification failed');
  res.status(403).send('Verification failed');
});

// POST — Receive Instagram DMs
instagramWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Quick 200 response to Meta (required within 20s)
    res.status(200).send('EVENT_RECEIVED');

    // Process messaging events
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const message = messaging.message?.text;

          if (!senderId || !message) continue;

          console.log(`📩 IG DM from ${senderId}: ${message}`);

          // Save inbound message to DB
          await prisma.messageLog.create({
            data: {
              platform: 'INSTAGRAM',
              senderId,
              message,
              direction: 'INBOUND',
            },
          });

          // Forward to AI agent for processing
          try {
            const agentResponse = await fetch(`${BOT_URL}/process-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message,
                sender_id: senderId,
                platform: 'INSTAGRAM',
              }),
            });

            if (agentResponse.ok) {
              const data = await agentResponse.json() as { response: string };
              const reply = data.response;

              // Save outbound response
              await prisma.messageLog.create({
                data: {
                  platform: 'INSTAGRAM',
                  senderId,
                  message: reply,
                  direction: 'OUTBOUND',
                },
              });

              // Send reply via Instagram Messaging API
              if (PAGE_ACCESS_TOKEN) {
                await sendInstagramReply(senderId, reply);
              }
            }
          } catch (error) {
            console.error('❌ Error processing IG message with bot:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Instagram webhook error:', error);
  }
});

async function sendInstagramReply(recipientId: string, message: string) {
  try {
    const graphDomain = PAGE_ACCESS_TOKEN.startsWith('IG') 
      ? 'graph.instagram.com/v21.0' 
      : 'graph.facebook.com/v18.0';

    const response = await fetch(
      `https://${graphDomain}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ IG reply error:', error);
    } else {
      console.log(`✅ IG reply sent to ${recipientId}`);
    }
  } catch (error) {
    console.error('❌ Failed to send IG reply:', error);
  }
}
