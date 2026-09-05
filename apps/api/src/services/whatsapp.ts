// ============================================
// WhatsApp Service (Native Baileys únicamente)
// ============================================

import { sendNativeWhatsAppMessage, getNativeStatus } from './whatsapp-native';
import { config } from '../config';

interface SendMessageOptions {
  to: string;
  message: string;
}

export async function sendEvolutionWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!config.EVOLUTION_API_URL || !config.EVOLUTION_API_KEY) {
    return false;
  }
  try {
    const cleanPhone = to.replace(/\D/g, '');
    const instanceName = config.INSTANCE_NAME || `glow-studio-${config.SALON_WHATSAPP}`;
    const url = `${config.EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${instanceName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });
    return res.ok;
  } catch (err: any) {
    console.error('❌ Error sending message via Evolution API:', err.message);
    return false;
  }
}

export async function sendWhatsAppMessage({ to, message }: SendMessageOptions): Promise<boolean> {
  if (config.EVOLUTION_API_URL && config.EVOLUTION_API_KEY) {
    const sentEvo = await sendEvolutionWhatsAppMessage(to, message);
    if (sentEvo) return true;
    console.warn('⚠️ Evolution API falló o no disponible. Intentando envío nativo con Baileys...');
  }

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

export async function sendCustomerConfirmationRequest(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  timeStr: string;
}): Promise<boolean> {
  const message = `✨ *¡Hola ${data.customerName}!* 💕\n\nTe recordamos tu turno para hoy en *Glow Studio*:\n\n💇 *Servicio:* ${data.serviceName}\n⏰ *Hora:* ${data.timeStr}\n\n👉 *¿Confirmás tu asistencia?*\n- Respondé *SÍ* para confirmarlo.\n- Respondé *NO* si necesitás cancelarlo o reprogramarlo.\n\n¡Muchas gracias! ✨`;

  return sendWhatsAppMessage({ to: data.customerPhone, message });
}
