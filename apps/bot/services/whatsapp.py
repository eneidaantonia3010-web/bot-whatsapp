# ============================================
# Glow Studio by Sofia — WhatsApp Service
# Integración con la API oficial de Meta
# (WhatsApp Cloud API via Graph API)
# ============================================

import os
import httpx


# Credenciales de Evolution API
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "BB3010")

SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5491155554444")

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
    """Envía un mensaje usando Evolution API."""
    if not EVOLUTION_API_URL or not EVOLUTION_API_KEY:
        print(f"📱 [DRY RUN] WA to {to}: {text}")
        return False

    # Limpiar el número de destino (solo dígitos)
    clean_number = to.replace("+", "").replace(" ", "").replace("-", "")
    
    # Asegurar el formato 549 para Argentina
    if clean_number.startswith("54") and not clean_number.startswith("549") and len(clean_number) >= 12:
        clean_number = clean_number[:2] + "9" + clean_number[2:]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EVOLUTION_API_URL}/message/sendText/{INSTANCE_NAME}",
                headers={
                    "apikey": EVOLUTION_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "number": clean_number,
                    "text": text,
                },
                timeout=10.0,
            )
            if response.status_code in [200, 201]:
                print(f"✅ WA message sent to {to}")
                return True
            else:
                print(f"❌ WA error: {response.text}")
                return False
    except Exception as e:
        print(f"❌ WA send failed: {e}")
        return False
