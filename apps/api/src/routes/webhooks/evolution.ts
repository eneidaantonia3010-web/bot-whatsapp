import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { sendWhatsAppMessage } from '../../services/whatsapp';
import { enqueueForSender } from '../../services/message-queue';

export const evolutionWebhookRouter = Router();

const BOT_URL = process.env.BOT_URL || 'http://localhost:8000';

evolutionWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Responder rápido a Evolution API
    res.status(200).send('OK');

    const body = req.body;
    
    if (process.env.DEBUG_WEBHOOKS === 'true') {
      console.log('🔍 [DEBUG Webhook Evolution]:', JSON.stringify(body).substring(0, 300));
    }
    
    // Solo procesar nuevos mensajes
    if (body.event !== 'messages.upsert') return;

    const messageData = body.data;
    if (!messageData) return;

    const remoteJid = messageData.key?.remoteJid;
    const fromMe = messageData.key?.fromMe;

    // Ignorar mensajes enviados por el bot o mensajes de grupos
    if (fromMe || !remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return;

    // Extraer texto
    const textMessage = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || messageData.text;
    if (!textMessage) return;

    const senderName = messageData.pushName || remoteJid.split('@')[0];

    // Encolar mensaje por sender JID para evitar condiciones de carrera
    await enqueueForSender(remoteJid, async () => {
      console.log(`📩 WA (Evolution) from ${remoteJid} (${senderName}): ${textMessage}`);

      // Check if customer is blocked (Blacklist)
      const cleanPhone = remoteJid.split('@')[0];
      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: `+${cleanPhone}` },
          ],
        },
      });

      if (customer?.blocked) {
        console.warn(`🚫 Mensaje ignorado de cliente bloqueado: ${remoteJid}`);
        return;
      }

      // Guardar mensaje entrante
      await prisma.messageLog.create({
        data: {
          platform: 'WHATSAPP',
          senderId: remoteJid,
          senderName,
          message: textMessage,
          direction: 'INBOUND',
        },
      });
      
      // Enviar a la IA (Python)

      try {
        const agentResponse = await fetch(`${BOT_URL}/process-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textMessage,
            sender_id: remoteJid,
            platform: 'WHATSAPP',
          }),
        });
        
        if (agentResponse.ok) {
           const data = await agentResponse.json() as { response: string };
           const reply = data.response;
           
           // Guardar respuesta
           await prisma.messageLog.create({
             data: {
               platform: 'WHATSAPP',
               senderId: remoteJid,
               message: reply,
               direction: 'OUTBOUND',
             },
           });
           
           // Enviar de vuelta a Evolution
           await sendWhatsAppMessage({ to: remoteJid, message: reply });
        }
      } catch (error) {
        console.error('❌ Error processing WA message with bot:', error);
      }
    });
  } catch (error) {
    console.error('❌ Evolution webhook error:', error);
  }
});

