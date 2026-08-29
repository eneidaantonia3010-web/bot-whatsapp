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
}): Promise<boolean> {
  const salonPhone = config.SALON_WHATSAPP;
  const message = `🔔 *Nuevo turno reservado*\n\n👤 ${data.customerName}\n💇 ${data.serviceName}\n📅 ${data.dateTime}\n\n_Reservado desde la web de Glow Studio_`;

  return sendWhatsAppMessage({ to: salonPhone, message });
}

export async function sendBookingConfirmation(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  dateTime: string;
}): Promise<boolean> {
  const message = `✨ *¡Hola ${data.customerName}!*\n\nTu turno en *Glow Studio* está confirmado:\n\n💇 *Servicio:* ${data.serviceName}\n📅 *Fecha y Hora:* ${data.dateTime}\n\n¡Te esperamos con muchas ganas! 💕`;
  
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
