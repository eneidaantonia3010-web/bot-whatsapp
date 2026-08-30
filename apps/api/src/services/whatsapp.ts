// ============================================
// WhatsApp Service (Native Baileys únicamente)
// ============================================

import { sendNativeWhatsAppMessage, getNativeStatus } from './whatsapp-native';
import { config } from '../config';

interface SendMessageOptions {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendMessageOptions): Promise<boolean> {
  const nativeStatus = getNativeStatus();
  if (nativeStatus.state !== 'open') {
    console.warn('⚠️ Native WhatsApp no conectado. Mensaje no enviado (reintentar cuando la sesión esté abierta).');
    return false;
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
