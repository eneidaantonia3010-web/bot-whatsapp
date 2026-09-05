# ============================================
# Glow Studio by Sofia — Human Escalation Service
# ============================================

import os
import logging
import httpx

try:
    from config import API_URL, SALON_WHATSAPP, API_SECRET_KEY
except ImportError:
    API_URL = os.getenv("API_URL", "https://glow-studio-api-2vzt.onrender.com")
    SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5491178296781")
    API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")

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
        
        headers = {}
        if API_SECRET_KEY:
            headers["x-api-key"] = API_SECRET_KEY

        # Send via the Express API's endpoints
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Notify salon owner via WhatsApp
            try:
                await client.post(
                    f"{API_URL}/api/admin/whatsapp/send",
                    headers=headers,
                    json={
                        "to": SALON_WHATSAPP,
                        "message": notification,
                    },
                )
            except Exception as eWa:
                logger.warning(f"Error sending WhatsApp escalation notification: {eWa}")

            # 2. Notify admin dashboard via SSE realtime event
            try:
                await client.post(
                    f"{API_URL}/api/realtime/escalate",
                    headers=headers,
                    json={
                        "senderId": sender_id,
                        "senderName": sender_name,
                        "reason": "Derivación a operador / Baja confianza reiterada",
                        "lastMessage": last_message,
                    },
                )
            except Exception as eRealtime:
                logger.warning(f"Error broadcasting escalation to realtime dashboard: {eRealtime}")

            logger.info(f"Escalation notification processed for {sender_id}")
            return True
    except Exception as e:
        logger.exception(f"Error sending escalation: {e}")
        return False
