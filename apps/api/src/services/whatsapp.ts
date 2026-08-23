// ============================================
// WhatsApp Service (Native Baileys + Optional Evolution Fallback)
// ============================================

import { withRetry } from '../utils/retry';
import { sendNativeWhatsAppMessage, getNativeStatus } from './whatsapp-native';
import { config } from '../config';

interface SendMessageOptions {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendMessageOptions): Promise<boolean> {
  // Try Native In-App WhatsApp Service first
  const nativeStatus = getNativeStatus();
  if (nativeStatus.state === 'open') {
    const sentNative = await sendNativeWhatsAppMessage(to, message);
    if (sentNative) return true;
  }

  // Fallback to Evolution API only if explicitly configured
  if (!config.EVOLUTION_API_URL || !config.EVOLUTION_API_KEY) {
    console.warn('⚠️ Native WhatsApp no conectado y Evolution API no configurada. Mensaje no enviado.');
    return false;
  }

  try {
    const targetNumber = to;
    return await withRetry(async () => {
      const response = await fetch(
        `${config.EVOLUTION_API_URL}/message/sendText/${config.INSTANCE_NAME}`,
        {
          method: 'POST',
          headers: {
            'apikey': config.EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: targetNumber,
            text: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Evolution API HTTP ${response.status}: ${error}`);
      }

      console.log(`✅ Mensaje enviado a ${to} vía Evolution fallback`);
      return true;
    }, { maxRetries: 3, baseDelayMs: 1000 });
  } catch (error) {
    console.error('❌ Falló el envío del mensaje de WhatsApp tras reintentos:', error);
    return false;
  }
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
