// ============================================
// WhatsApp Service (Evolution API)
// ============================================

const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';

interface SendMessageOptions {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendMessageOptions): Promise<boolean> {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    console.warn('⚠️ Meta WhatsApp API no configurada. Mensaje no enviado.');
    console.log(`📱 [DRY RUN] WhatsApp a ${to}:\n${message}`);
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Meta WhatsApp API error:', error);
      return false;
    }

    console.log(`✅ Mensaje de WhatsApp enviado a ${to}`);
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
  const salonPhone = process.env.SALON_WHATSAPP || '5411555544444';
  const message = `🔔 *Nuevo turno reservado*\n\n👤 ${data.customerName}\n💇 ${data.serviceName}\n📅 ${data.dateTime}\n\n_Reservado desde la web de Glow Studio_`;

  return sendWhatsAppMessage({ to: salonPhone, message });
}

interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode: string;
  components: any[];
}

export async function sendWhatsAppTemplate({ to, templateName, languageCode, components }: SendTemplateOptions): Promise<boolean> {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    console.warn('⚠️ Meta WhatsApp API no configurada. Plantilla no enviada.');
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Meta WhatsApp Template error:', error);
      return false;
    }

    console.log(`✅ Plantilla de WhatsApp enviada a ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Falló el envío de la plantilla de WhatsApp:', error);
    return false;
  }
}

export async function sendBookingConfirmation(data: {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  dateTime: string;
}): Promise<boolean> {
  return sendWhatsAppTemplate({
    to: data.customerPhone,
    templateName: 'confirmacion_turno',
    languageCode: 'es',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.customerName },
          { type: 'text', text: data.serviceName },
          { type: 'text', text: data.dateTime }
        ]
      }
    ]
  });
}

export async function sendSalonUpcomingAlert(data: {
  customerName: string;
  serviceName: string;
  timeStr: string;
}): Promise<boolean> {
  const salonPhone = process.env.SALON_WHATSAPP || '5411555544444';
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
