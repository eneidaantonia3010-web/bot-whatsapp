// ============================================
// WhatsApp Service (Evolution API)
// ============================================

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'GlowStudioBot';

interface SendMessageOptions {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendMessageOptions): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('⚠️ Evolution API no configurada. Mensaje no enviado.');
    console.log(`📱 [DRY RUN] WhatsApp a ${to}:\n${message}`);
    return false;
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: to,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Evolution API error:', error);
      return false;
    }

    console.log(`✅ Mensaje enviado a ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Falló el envío del mensaje de WhatsApp:', error);
    return false;
  }
}

export async function sendWhatsAppNotification(data: {
  customerName: string;
  serviceName: string;
  dateTime: string;
}): Promise<boolean> {
  const salonPhone = process.env.SALON_WHATSAPP || '5491178296781';
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
  const salonPhone = process.env.SALON_WHATSAPP || '5491178296781';
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
