# ============================================
# Glow Studio by Sofia — Human Escalation Service
# ============================================

import os
import logging
import httpx

try:
    from config import API_URL, SALON_WHATSAPP
except ImportError:
    API_URL = os.getenv("API_URL", "https://glow-studio-api-2vzt.onrender.com")
    SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5491178296781")

logger = logging.getLogger("glow_bot.escalation")


def build_escalation_summary(conv: dict, last_message: str) -> str:
    """Build a summary of the conversation for the salon owner."""
    parts = []
    
    stage = conv.get("stage", "unknown")
    service = conv.get("selected_service")
    date = conv.get("selected_date")
    time = conv.get("selected_time")
    name = conv.get("customer_name")
    
    if service:
        parts.append(f"💇 Servicio: {service.get('name', 'N/A')}")
    if date and time:
        parts.append(f"📅 Fecha/Hora: {date} a las {time}hs")
    if name:
        parts.append(f"👤 Nombre: {name}")
    parts.append(f"📋 Etapa: {stage}")
    
    # Last few messages from history
    history = conv.get("chat_history", [])
    if history:
        recent = history[-4:]  # Last 2 exchanges
        parts.append("\n💬 *Últimos mensajes:*")
        for msg in recent:
            role = "👤" if msg.get("role") == "user" else "🤖"
            text = msg.get("parts", [""])[0][:100]
            parts.append(f"{role} {text}")
    
    return "\n".join(parts)


async def escalate_to_human(
    sender_id: str,
    sender_name: str,
    conversation_summary: str,
    last_message: str,
) -> bool:
    """Send escalation notification to salon owner via the Express API."""
    try:
        # Build notification message for Sofia
        notification = (
            f"🆘 *Solicitud de atención humana*\n\n"
            f"👤 Cliente: *{sender_name}*\n"
            f"📱 Contacto: {sender_id}\n"
            f"💬 Último mensaje: _{last_message[:200]}_\n\n"
            f"📋 *Contexto de la conversación:*\n{conversation_summary}\n\n"
            f"_Para responder, abrí WhatsApp y escribile directamente._"
        )
        
        # Send via the Express API's WhatsApp notification endpoint
        async with httpx.AsyncClient() as client:
            # Use the salon's own WhatsApp to notify
            response = await client.post(
                f"{API_URL}/api/admin/whatsapp/send",
                json={
                    "to": SALON_WHATSAPP,
                    "message": notification,
                },
                timeout=10.0,
            )
            if response.status_code in (200, 201):
                logger.info(f"Escalation notification sent for {sender_id}")
                return True
            else:
                logger.error(f"Escalation API error: {response.status_code} {response.text}")
                return False
    except Exception as e:
        logger.exception(f"Error sending escalation: {e}")
        return False
