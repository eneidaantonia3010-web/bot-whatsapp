import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { sendWhatsAppMessage } from '../../services/whatsapp';

export const evolutionWebhookRouter = Router();

const BOT_URL = process.env.BOT_URL || 'http://localhost:8000';

evolutionWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Responder rápido a Evolution API
    res.status(200).send('OK');

    const body = req.body;
    
    // Solo procesar nuevos mensajes
    if (body.event !== 'messages.upsert') return;

    const messageData = body.data;
    if (!messageData) return;

    const remoteJid = messageData.key?.remoteJid;
    const fromMe = messageData.key?.fromMe;
    
    // Ignorar mensajes enviados por el bot o mensajes de grupos
    if (fromMe || !remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return;

    // Extraer texto
    const textMessage = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text;
    if (!textMessage) return;

    const senderName = messageData.pushName || remoteJid.split('@')[0];

    console.log(`📩 WA (Evolution) from ${remoteJid} (${senderName}): ${textMessage}`);

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
  } catch (error) {
    console.error('❌ Evolution webhook error:', error);
  }
});
