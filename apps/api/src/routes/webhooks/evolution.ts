import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { sendWhatsAppMessage } from '../../services/whatsapp';
import { enqueueForSender } from '../../services/message-queue';

export const evolutionWebhookRouter = Router();

let BOT_URL = process.env.BOT_URL || 'https://glow-studio-bot-7ghr.onrender.com';
if (process.env.NODE_ENV === 'production' && (!process.env.BOT_URL || BOT_URL.includes('localhost'))) {
  BOT_URL = 'https://glow-studio-bot-7ghr.onrender.com';
}
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api-latest-yicm.onrender.com';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'Disjd12-9';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'glow-studio-5491173566392';

evolutionWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Responder rápido a Evolution API
    res.status(200).send('OK');

    const body = req.body;
    
    console.log('🔍 [DEBUG Webhook Evolution Event]:', body.event, 'Instance:', body.instance);
    
    // Process CONNECTION_UPDATE events
    if (body.event === 'connection.update' || body.event === 'CONNECTION_UPDATE') {
      const connData = body.data;
      const state = connData?.state || connData?.status;
      const statusReason = connData?.statusReason;

      console.log(`🔌 [Evolution Connection Webhook] Instance: ${body.instance}, State: ${state}, Reason: ${statusReason}`);

      if (state === 'close') {
        if (statusReason === 401) {
          console.error(`🚨 [WhatsApp Alert] Instancia ${body.instance} desvinculada (Error 401 device_removed). Se requiere escanear nuevo QR.`);
        } else {
          console.warn(`⚠️ [WhatsApp Reconnect] Instancia ${body.instance} desconectada por razón ${statusReason}. Intentando auto-reconectar...`);
          if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            setTimeout(async () => {
              try {
                await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
                  headers: { 'apikey': EVOLUTION_API_KEY },
                });
                console.log(`✅ [WhatsApp Reconnect] Intento de reconexión enviado a Evolution API.`);
              } catch (err) {
                console.error(`❌ Error intentando auto-reconectar:`, err);
              }
            }, 3000);
          }
        }
      }
      return;
    }

    // Solo procesar nuevos mensajes (case-insensitive para MESSAGES_UPSERT y messages.upsert)
    const eventName = (body.event || '').toLowerCase().replace('_', '.');
    if (eventName !== 'messages.upsert') return;

    let messageData = body.data;
    if (Array.isArray(messageData)) {
      messageData = messageData[0];
    }
    if (!messageData) return;

    let remoteJid = messageData.key?.remoteJid;
    if (remoteJid?.endsWith('@lid') && messageData.key?.remoteJidAlt) {
      console.log(`🔀 LID addressing mode detected. Mapping ${remoteJid} -> ${messageData.key.remoteJidAlt}`);
      remoteJid = messageData.key.remoteJidAlt;
    }
    const fromMe = messageData.key?.fromMe;

    console.log(`📩 [Evolution Webhook Message] remoteJid: ${remoteJid}, fromMe: ${fromMe}`);

    // Ignorar mensajes enviados por el bot o mensajes de grupos
    if (fromMe || !remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
      console.log(`⏭️ Ignoring message fromMe: ${fromMe}, remoteJid: ${remoteJid}`);
      return;
    }

    // Extraer texto (soporta conversation, extendedTextMessage, captions e imágenes)
    const textMessage = 
      messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || 
      messageData.message?.imageMessage?.caption ||
      messageData.message?.videoMessage?.caption ||
      messageData.text;
    if (!textMessage) {
      console.log(`⚠️ No text content found in message from ${remoteJid}`);
      return;
    }

    const senderName = messageData.pushName || remoteJid.split('@')[0];

    // Encolar mensaje por sender JID para evitar condiciones de carrera
    await enqueueForSender(remoteJid, async () => {
      console.log(`📩 Processing WA (Evolution) from ${remoteJid} (${senderName}): ${textMessage}`);

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
        console.log(`🤖 Calling Python Bot at: ${BOT_URL}/process-message`);
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
           console.log(`🤖 Bot reply generated for ${remoteJid}: ${reply.substring(0, 100)}...`);
           
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
           console.log(`📤 Sending reply back to WhatsApp via Evolution API to ${remoteJid}...`);
           const sent = await sendWhatsAppMessage({ to: remoteJid, message: reply });
           console.log(`📤 Send WhatsApp result to ${remoteJid}: ${sent}`);
        } else {
           console.error(`❌ Bot API returned HTTP status ${agentResponse.status}`);
        }
      } catch (error) {
        console.error(`❌ Error processing WA message with bot at ${BOT_URL}:`, error);
      }
    });
  } catch (error) {
    console.error('❌ Evolution webhook error:', error);
  }
});
