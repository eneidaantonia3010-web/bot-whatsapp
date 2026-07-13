# ============================================
# Glow Studio by Sofia — WhatsApp Service
# Integración con la API oficial de Meta
# (WhatsApp Cloud API via Graph API)
# ============================================

import os
import httpx


# Credenciales de la API de Meta (WhatsApp Cloud API)
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5411555544444")

# URL base de la API de Meta Graph
GRAPH_API_URL = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"


async def send_whatsapp_notification(
    customer_name: str,
    service_name: str,
    date_time: str,
) -> bool:
    """Envía una notificación de reserva al salón vía WhatsApp."""
    message = (
        f"🔔 *Nuevo turno reservado*\n\n"
        f"👤 {customer_name}\n"
        f"💇 {service_name}\n"
        f"📅 {date_time}\n\n"
        f"_Reservado desde Instagram vía bot IA_"
    )
    return await send_message(SALON_WHATSAPP, message)


async def send_message(to: str, text: str) -> bool:
    """Envía un mensaje de WhatsApp usando la API oficial de Meta (Cloud API)."""
    if not WHATSAPP_PHONE_ID or not WHATSAPP_TOKEN:
        print(f"📱 [DRY RUN] WA to {to}: {text}")
        return False

    # Limpiar el número de destino (solo dígitos)
    clean_number = to.replace("+", "").replace(" ", "").replace("-", "")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GRAPH_API_URL,
                headers={
                    "Authorization": f"Bearer {WHATSAPP_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": clean_number,
                    "type": "text",
                    "text": {
                        "preview_url": False,
                        "body": text,
                    },
                },
                timeout=10.0,
            )
            if response.status_code == 200:
                print(f"✅ WA message sent to {to}")
                return True
            else:
                print(f"❌ WA error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ WA send failed: {e}")
        return False
