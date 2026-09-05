// ============================================
// WhatsApp Service (Native Baileys Exclusivo)
// ============================================

import { sendNativeWhatsAppMessage, getNativeStatus } from './whatsapp-native';
import { enqueuePersistentMessage } from './message-queue';
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
