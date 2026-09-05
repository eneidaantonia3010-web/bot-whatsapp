// ============================================
// Evolution API Webhook Receiver
// Processes incoming WhatsApp messages (Yes/No confirmations, text, audio)
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../../services/prisma';
import { sendWhatsAppMessage } from '../../services/whatsapp';
import { config } from '../../config';

export const evolutionWebhookRouter = Router();

const AFFIRMATIVE_REGEX = /^(s[ií]|si\b|s[ií]\s*confirmo|confirmo|confirmar|dale|ok|asisto|ahi\s*estare|ahí\s*estaré)$/i;
const NEGATIVE_REGEX = /^(no|cancelo|cancelar|no\s*voy|no\s*puedo|reprogramar)$/i;

export async function processEvolutionMessage(payload: any): Promise<{ status: string; detail?: string }> {
  try {
    const data = payload.data || payload;
    const key = data.key || {};
    const remoteJid = key.remoteJid || payload.remoteJid;

    if (!remoteJid || key.fromMe || remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
      return { status: 'ignored' };
    }

    const cleanPhone = remoteJid.split('@')[0].replace(/\D/g, '');
    const phoneSuffix = cleanPhone.slice(-8);

    // Extract text from standard Evolution API payload structures
    const messageContent = data.message || {};
    let text =
      messageContent.conversation ||
      messageContent.extendedTextMessage?.text ||
      messageContent.imageMessage?.caption ||
      data.body ||
      '';

    text = typeof text === 'string' ? text.trim() : '';

    // Handle voice note / audio message
    const hasAudio = messageContent.audioMessage || data.messageType === 'audioMessage';
    if (hasAudio && !text) {
      const audioBase64 =
        data.base64 ||
        messageContent.audioMessage?.base64 ||
        data.message?.base64;

      if (audioBase64) {
        try {
          const audioBotRes = await fetch(`${config.BOT_URL}/process-audio-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.API_SECRET_KEY ? { 'x-api-key': config.API_SECRET_KEY } : {}),
            },
            body: JSON.stringify({
              audio_base64: audioBase64,
              sender_id: remoteJid,
              platform: 'WHATSAPP',
            }),
          });

          if (audioBotRes.ok) {
            const botData = (await audioBotRes.json()) as { response?: string };
            if (botData.response) {
              await sendWhatsAppMessage({ to: remoteJid, message: botData.response });
              return { status: 'audio_transcribed_and_replied', detail: remoteJid };
            }
          }
        } catch (audioErr: any) {
          console.warn('⚠️ Audio processing error:', audioErr.message);
        }
      }
      return { status: 'audio_detected', detail: remoteJid };
    }

    if (!text) {
      return { status: 'empty_message' };
    }

    const cleanText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!¡?¿\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const isNegative =
      /^(no\b|cancelo\b|cancelar\b|no voy\b|no puedo\b|reprogramar\b)/i.test(cleanText) ||
      /\b(cancelo|cancelar|no puedo asistir)\b/i.test(cleanText);

    const isAffirmative =
      !isNegative &&
      (/^(si\b|confirmo\b|confirmar\b|dale\b|ok\b|asisto\b|ahi estare\b)/i.test(cleanText) ||
        /\b(confirmo|asisto)\b/i.test(cleanText));

    // 1. Check for Confirmation ("SÍ")
    if (isAffirmative) {
      const pendingApt = await prisma.appointment.findFirst({
        where: {
          customer: {
            OR: [
              { phone: { contains: phoneSuffix } },
              { phone: cleanPhone },
            ],
          },
          status: 'PENDING',
          date: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // from 1h ago onwards
        },
        include: { customer: true, service: true },
        orderBy: { date: 'asc' },
      });

      if (pendingApt) {
        await prisma.appointment.update({
          where: { id: pendingApt.id },
          data: { status: 'CONFIRMED' },
        });

        const timeStr = pendingApt.date.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        }) + 'hs';

        const reply = `🎉 ¡Muchas gracias ${pendingApt.customer.name}! 💕\n\nTu turno para *${pendingApt.service.name}* a las *${timeStr}* ha quedado *confirmado*.\n\n¡Te esperamos en *Glow Studio*! ✨`;
        await sendWhatsAppMessage({ to: remoteJid, message: reply });
        return { status: 'confirmed', detail: pendingApt.id };
      }
    }

    // 2. Check for Cancellation ("NO")
    if (isNegative) {
      const upcomingApt = await prisma.appointment.findFirst({
        where: {
          customer: {
            OR: [
              { phone: { contains: phoneSuffix } },
              { phone: cleanPhone },
            ],
          },
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        include: { customer: true, service: true },
        orderBy: { date: 'asc' },
      });

      if (upcomingApt) {
        await prisma.appointment.update({
          where: { id: upcomingApt.id },
          data: {
            status: 'CANCELLED',
            notes: (upcomingApt.notes ? upcomingApt.notes + ' | ' : '') + 'Cancelado vía respuesta de confirmación WhatsApp',
          },
        });

        const reply = `Entendido ${upcomingApt.customer.name}. Tu turno para *${upcomingApt.service.name}* ha sido *cancelado*.\n\nCuando desees reprogramar, escribinos o reservá desde nuestra web. ¡Que tengas un lindo día! 💕`;
        await sendWhatsAppMessage({ to: remoteJid, message: reply });
        return { status: 'cancelled', detail: upcomingApt.id };
      }
    }

    // 3. Fallback: Forward message to Python Bot
    try {
      const botController = new AbortController();
      const botTimeout = setTimeout(() => botController.abort(), 30000);

      const botRes = await fetch(`${config.BOT_URL}/process-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.API_SECRET_KEY,
        },
        body: JSON.stringify({
          message: text,
          sender_id: remoteJid,
          platform: 'WHATSAPP',
        }),
        signal: botController.signal,
      });

      clearTimeout(botTimeout);

      if (botRes.ok) {
        const botData = (await botRes.json()) as { response?: string };
        if (botData.response) {
          await sendWhatsAppMessage({ to: remoteJid, message: botData.response });
          return { status: 'bot_replied' };
        }
      } else {
        const errDetail = await botRes.text().catch(() => '');
        console.error(`❌ Evolution webhook bot forward failed with HTTP ${botRes.status}: ${errDetail}`);
      }
    } catch (botErr: any) {
      console.warn('⚠️ Forwarding to bot warning:', botErr.message);
    }

    // If bot didn't reply, send friendly fallback
    const fallbackReply =
      "¡Hola! Bienvenida a *Glow Studio by Sofia* ✨\n\n" +
      "Disculpá la demora momentánea 💕 Podés consultar todos nuestros servicios y turnos disponibles en nuestra web:\n" +
      `${config.FRONTEND_URL || 'https://glow-studio-web.onrender.com'}\n\n` +
      "O dejanos tu consulta que a la brevedad te responderemos personalmente 💕";
    await sendWhatsAppMessage({ to: remoteJid, message: fallbackReply });

    return { status: 'processed' };
  } catch (error: any) {
    console.error('❌ Error processing Evolution webhook:', error);
    return { status: 'error', detail: error.message };
  }
}

// POST /api/webhooks/evolution
evolutionWebhookRouter.post('/', async (req: Request, res: Response) => {
  const result = await processEvolutionMessage(req.body);
  return res.json({ success: true, result });
});
