import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { config } from '../../config';
import { verifyMetaSignature } from '../../services/webhook-security';
import { enqueueForSender } from '../../services/message-queue';

export const instagramWebhookRouter = Router();

// GET — Webhook verification (Meta challenge)
instagramWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Instagram webhook verification failed');
  res.status(403).send('Verification failed');
});

// POST — Receive Instagram DMs
instagramWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Validate signature if header is present
    if (req.headers['x-hub-signature-256'] && !verifyMetaSignature(req)) {
      console.warn('❌ Invalid signature on Instagram webhook');
      return res.status(403).send('Invalid signature');
    }

    const body = req.body;

    // Quick 200 response to Meta (required within 20s)
    res.status(200).send('EVENT_RECEIVED');

    // Process messaging events
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const message = messaging.message?.text;
          const isEcho = messaging.message?.is_echo || false;

          // Ignore echo messages (messages sent by the Instagram Page itself)
          if (isEcho || !senderId || !message) {
            if (isEcho) console.log(`⏭️ Ignoring IG DM echo from ${senderId}`);
            continue;
          }

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

          // Forward to AI agent for processing via Sender Queue
          enqueueForSender(senderId, async () => {
            try {
              const agentResponse = await fetch(`${config.BOT_URL}/process-message`, {
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
                if (config.META_PAGE_ACCESS_TOKEN) {
                  await sendInstagramReply(senderId, reply);
                }
              }
            } catch (error) {
              console.error('❌ Error processing IG message with bot:', error);
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Instagram webhook error:', error);
  }
});

async function sendInstagramReply(recipientId: string, message: string) {
  try {
    const token = config.META_PAGE_ACCESS_TOKEN;
    const graphDomain = token.startsWith('IG') 
      ? 'graph.instagram.com/v21.0' 
      : 'graph.facebook.com/v18.0';

    const response = await fetch(
      `https://${graphDomain}/me/messages?access_token=${token}`,
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
