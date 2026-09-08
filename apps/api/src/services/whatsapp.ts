// ============================================
// WhatsApp Service (Native Baileys Exclusivo)
// ============================================

import { sendNativeWhatsAppMessage, getNativeStatus } from './whatsapp-native';
import { enqueuePersistentMessage } from './message-queue';
import { prisma } from './prisma';
import { config } from '../config';

interface SendMessageOptions {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendMessageOptions): Promise<boolean> {
  const nativeStatus = getNativeStatus();
  if (nativeStatus.state !== 'open') {
    console.warn(`⚠️ Native WhatsApp no conectado (estado: ${nativeStatus.state}). Encolando mensaje para ${to} en PostgreSQL.`);
    const formattedJid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
    try {
      await enqueuePersistentMessage({
        jid: formattedJid,
        message: { text: message },
        priority: 2,
      });
      return true;
    } catch (qErr: any) {
      console.error(`❌ Error encolando mensaje persistente para ${to}:`, qErr?.message);
      return false;
    }
  }

  const sentNative = await sendNativeWhatsAppMessage(to, message);
  if (!sentNative) {
    console.error(`❌ Falló el envío nativo del mensaje a ${to}`);
  }
  return sentNative;
}

export async function sendWhatsAppNotification(data: {
  customerName: string;
  serviceName: string;
  dateTime: string;
  price?: number | string;
}): Promise<boolean> {
  const salonPhone = config.SALON_WHATSAPP;
  const formattedPrice = data.price ? `$${Number(data.price).toLocaleString('es-AR')}` : '';
  const priceLine = formattedPrice ? `\n💰 ${formattedPrice}` : '';
  const message = `🔔 *Nuevo turno reservado*\n\n👤 ${data.customerName}\n💇 ${data.serviceName}\n📅 ${data.dateTime}${priceLine}\n\n_Reservado en Glow Studio_`;

  return sendWhatsAppMessage({ to: salonPhone, message });
}

export async function sendBookingConfirmation(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  dateTime: string;
  price?: number | string;
}): Promise<boolean> {
  const formattedPrice = data.price ? `$${Number(data.price).toLocaleString('es-AR')}` : '';
  const priceLine = formattedPrice ? `\n💰 *Total a abonar:* ${formattedPrice}` : '';
  const message = `✨ *¡Hola ${data.customerName}!*

Tu turno en *Glow Studio* está confirmado:

💇 *Servicio:* ${data.serviceName}
📅 *Fecha y Hora:* ${data.dateTime}${priceLine}

¡Te esperamos con muchas ganas! 💕✨`;
  
  return sendWhatsAppMessage({
    to: data.customerPhone,
    message
  });
}

export async function sendSalonUpcomingAlert(data: {
  customerName: string;
  serviceName: string;
  timeStr: string;
}): Promise<boolean> {
  const salonPhone = config.SALON_WHATSAPP;
  const message = `⏳ *¡Turno en 45 minutos!*\n\n👤 ${data.customerName}\n💇 ${data.serviceName}\n⏰ ${data.timeStr}\n\n_El sistema le acaba de enviar un mensaje automático a la clienta para que confirme su asistencia._`;

  return sendWhatsAppMessage({ to: salonPhone, message });
}

export async function sendCustomerReminder(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  timeStr: string;
}): Promise<boolean> {
  const message = `✨ *¡Hola ${data.customerName}!*\n\nTe recordamos que en aprox. 45 minutos tenés tu turno en *Glow Studio*:\n\n💇 ${data.serviceName}\n⏰ ${data.timeStr}\n\n👉 *Por favor, respondé este mensaje con un "Sí" para confirmar tu asistencia*, o avisanos si tenés algún inconveniente.\n\n¡Te esperamos! 💕`;

  return sendWhatsAppMessage({ to: data.customerPhone, message });
}

export async function sendCustomer24hReminder(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  timeStr: string;
}): Promise<boolean> {
  const message = `✨ *¡Hola ${data.customerName}!* 💕\n\nTe recordamos tu turno para *mañana* en *Glow Studio*:\n\n💇 *Servicio:* ${data.serviceName}\n⏰ *Hora:* ${data.timeStr}\n\n👉 *Por favor, respondé este mensaje con un "Sí" para confirmar tu asistencia*, o avisanos si necesitás reprogramar.\n\n¡Te esperamos con muchas ganas! ✨`;

  return sendWhatsAppMessage({ to: data.customerPhone, message });
}

export async function sendCustomerConfirmationRequest(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  timeStr: string;
}): Promise<boolean> {
  const message = `✨ *¡Hola ${data.customerName}!* 💕\n\nTe recordamos tu turno para hoy en *Glow Studio*:\n\n💇 *Servicio:* ${data.serviceName}\n⏰ *Hora:* ${data.timeStr}\n\n👉 *¿Confirmás tu asistencia?*\n- Respondé *SÍ* para confirmarlo.\n- Respondé *NO* si necesitás cancelarlo o reprogramarlo.\n\n¡Muchas gracias! ✨`;

  return sendWhatsAppMessage({ to: data.customerPhone, message });
}

export async function processEvolutionMessage(payload: any): Promise<{ status: string; detail?: string }> {
  try {
    const data = payload.data || payload;
    const key = data.key || {};
    const remoteJid = key.remoteJid || payload.remoteJid;

    if (!remoteJid || key.fromMe || remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
      return { status: 'ignored' };
    }

    const replyJid = (data.key as any)?.originalJid || remoteJid;
    const rawDigits = remoteJid.split('@')[0].replace(/\D/g, '');
    const phoneVariants: string[] = [];
    if (rawDigits.length >= 7) {
      phoneVariants.push(rawDigits);
      phoneVariants.push(`+${rawDigits}`);
      const without54 = rawDigits.replace(/^549?/, '');
      if (without54) {
        phoneVariants.push(without54);
        phoneVariants.push(`15${without54.replace(/^11/, '')}`);
      }
    }
    const phoneSuffix8 = rawDigits.slice(-8);
    const phoneSuffix7 = rawDigits.slice(-7);

    const customerPhoneMatch: any[] = [
      ...phoneVariants.map((p) => ({ phone: p })),
      ...(phoneSuffix8 ? [{ phone: { contains: phoneSuffix8 } }] : []),
      ...(phoneSuffix7 ? [{ phone: { contains: phoneSuffix7 } }] : []),
    ];

    const messageContent = data.message || {};
    let text =
      messageContent.conversation ||
      messageContent.extendedTextMessage?.text ||
      messageContent.imageMessage?.caption ||
      data.body ||
      '';

    text = typeof text === 'string' ? text.trim() : '';
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

    const isIsolatedNegative = /^(no\b|nop\b|cancelo\b|cancelar\b|no voy\b|no puedo\b)/i.test(cleanText) && cleanText.length <= 25;
    const isNegative =
      isIsolatedNegative ||
      /\b(cancelo|cancelar|no voy a ir|no puedo asistir|no podre asistir)\b/i.test(cleanText);

    const isIsolatedAffirmative = /^(si\b|confirmo\b|confirmar\b|dale\b|ok\b|asisto\b|ahi estare\b)/i.test(cleanText) && cleanText.length <= 25;
    const isAffirmative =
      !isNegative &&
      (isIsolatedAffirmative || /\b(confirmo|asisto)\b/i.test(cleanText));

    const searchDateMin = new Date(Date.now() - 24 * 60 * 60 * 1000); // from 24h ago onwards

    // 1. Check for Confirmation ("SÍ")
    if (isAffirmative) {
      let pendingApt = await prisma.appointment.findFirst({
        where: {
          customer: {
            OR: customerPhoneMatch,
          },
          status: 'PENDING',
          date: { gte: searchDateMin },
        },
        include: { customer: true, service: true },
        orderBy: { date: 'asc' },
      });

      // Fallback: check any future pending appointment
      if (!pendingApt) {
        pendingApt = await prisma.appointment.findFirst({
          where: {
            customer: {
              OR: customerPhoneMatch,
            },
            status: 'PENDING',
          },
          include: { customer: true, service: true },
          orderBy: { date: 'asc' },
        });
      }

      if (pendingApt) {
        await prisma.appointment.update({
          where: { id: pendingApt.id },
          data: { status: 'CONFIRMED' },
        });

        const timeStr =
          pendingApt.date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires',
          }) + 'hs';

        const reply = `🎉 ¡Muchas gracias ${pendingApt.customer.name}! 💕\n\nTu turno para *${pendingApt.service.name}* a las *${timeStr}* ha quedado *confirmado*.\n\n¡Te esperamos en *Glow Studio*! ✨`;
        await sendWhatsAppMessage({ to: replyJid, message: reply });
        return { status: 'confirmed', detail: pendingApt.id };
      }

      if (isIsolatedAffirmative) {
        const reply = `Hola 💕 No encontré ningún turno pendiente de confirmación a este número. Si querés consultar tus turnos o agendar uno nuevo, escribí *turnos* o visitá nuestra web ✨`;
        await sendWhatsAppMessage({ to: replyJid, message: reply });
        return { status: 'no_appointment_found' };
      }
    }

    // 2. Check for Cancellation ("NO")
    if (isNegative) {
      let upcomingApt = await prisma.appointment.findFirst({
        where: {
          customer: {
            OR: customerPhoneMatch,
          },
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: searchDateMin },
        },
        include: { customer: true, service: true },
        orderBy: { date: 'asc' },
      });

      // Fallback: check any future appointment
      if (!upcomingApt) {
        upcomingApt = await prisma.appointment.findFirst({
          where: {
            customer: {
              OR: customerPhoneMatch,
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          include: { customer: true, service: true },
          orderBy: { date: 'asc' },
        });
      }

      if (upcomingApt) {
        const now = Date.now();
        const aptTime = new Date(upcomingApt.date).getTime();
        const diffHours = (aptTime - now) / (1000 * 60 * 60);

        const cancellationNote = diffHours < 2
          ? 'Cancelado vía respuesta de confirmación WhatsApp (<2hs de anticipación)'
          : 'Cancelado vía respuesta de confirmación WhatsApp';

        await prisma.appointment.update({
          where: { id: upcomingApt.id },
          data: {
            status: 'CANCELLED',
            notes: (upcomingApt.notes ? upcomingApt.notes + ' | ' : '') + cancellationNote,
          },
        });

        let policyNotice = '';
        if (diffHours < 2) {
          policyNotice = '\n\n⚠️ *Política del salón:* Te recordamos con cariño que solicitamos avisar con al menos *2 horas de anticipación* para que otra clienta en lista de espera pueda aprovechar el lugar. Por esta vez no te preocupes 💕';
        }

        const reply = `Entendido ${upcomingApt.customer.name}. Tu turno para *${upcomingApt.service.name}* ha sido *cancelado*.${policyNotice}\n\nCuando desees reprogramar, escribinos o reservá desde nuestra web. ¡Que tengas un lindo día! 💕`;
        await sendWhatsAppMessage({ to: replyJid, message: reply });
        return { status: 'cancelled', detail: upcomingApt.id };
      }

      if (isIsolatedNegative) {
        const reply = `Hola 💕 No encontré ningún turno activo o pendiente a este número para cancelar. Si querés consultar tus reservas o agendar una nueva, podés escribir *turnos* o visitar nuestra web ✨`;
        await sendWhatsAppMessage({ to: replyJid, message: reply });
        return { status: 'no_appointment_found' };
      }
    }

    return { status: 'unhandled' };
  } catch (error: any) {
    console.error('❌ Error processing inbound appointment confirmation:', error);
    return { status: 'error', detail: error.message };
  }
}

