# ============================================
# Glow Studio by Sofia — WhatsApp Service
# Integración con la API oficial de Meta
# (WhatsApp Cloud API via Graph API)
# ============================================

import os
import logging
import httpx

logger = logging.getLogger("glow_bot.whatsapp")

try:
    from config import API_URL, SALON_WHATSAPP
except ImportError:
    API_URL = os.getenv("API_URL", "https://glow-studio-api-2vzt.onrender.com")
    SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5491178296781")


from typing import Optional

async def send_whatsapp_notification(
    customer_name: str,
    service_name: str,
    date_time: str,
    price: Optional[int | float | str] = None,
) -> bool:
    """Envía una notificación de reserva al salón vía WhatsApp."""
    price_str = f"\n💰 ${int(price):,}".replace(",", ".") if price else ""
    message = (
        f"🔔 *Nuevo turno reservado*\n\n"
        f"👤 {customer_name}\n"
        f"💇 {service_name}\n"
        f"📅 {date_time}{price_str}\n\n"
        f"_Reservado vía bot IA_"
    )
    return await send_message(SALON_WHATSAPP, message)


async def send_message(to: str, text: str) -> bool:
    """Envía un mensaje de WhatsApp a través de la API del salón (Baileys Nativo)."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/admin/whatsapp/send",
                headers={"Content-Type": "application/json"},
                json={
                    "to": to,
                    "message": text,
                },
                timeout=10.0,
            )
            if response.status_code in [200, 201]:
                logger.info(f"WA message sent to {to} via Express API")
                return True
            else:
                logger.warning(f"WA send via API returned {response.status_code}: {response.text}")
                return False
    except Exception as e:
        logger.warning(f"WA send via API failed: {e}")
        return False
