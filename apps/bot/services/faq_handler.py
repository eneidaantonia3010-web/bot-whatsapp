# ============================================
# Glow Studio by Sofia — Extended FAQ Knowledge Base
# ============================================

from typing import Optional

FAQ_KNOWLEDGE_BASE = {
    "ubicacion": (
        "📍 *Nuestra Dirección:*\n"
        "Estamos ubicadas en *Av. Corrientes 1234, CABA*.\n"
        "⏰ Horarios: Lunes a Sábado de 9:00 a 19:00hs.\n\n"
        "🚗 *Estacionamiento:* Contamos con estacionamiento medido sobre la avenida "
        "y un garage comercial a 50 metros sobre la calle Lavalle."
    ),
    "horario": (
        "🕐 *Nuestros Horarios:*\n"
        "*Lunes a Sábado:* de 9:00 a 19:00hs\n"
        "*Domingos:* Cerradas 😴\n\n"
        "La última cita se puede agendar hasta las 18:00hs."
    ),
    "servicios": (
        "✨ *Nuestros Servicios:*\n\n"
        "💇 *Corte y Estilismo* — $25.000 disponibles\n"
        "💆 *Masajes* — Desde $35.000\n"
        "💅 *Manicure/Pedicure* — Desde $12.000\n"
        "💜 *Tintes* — Desde $30.000\n"
        "🔥 *Treatments* — Desde $40.000\n\n"
        "Para ver el catálogo completo con precios, escribí: *reservar* y te lo mostramos 😊"
    ),
    "metodos_pago": (
        "💳 *Métodos de Pago Aceptados:*\n"
        "- Efectivo (10% de descuentos ✨)\n"
        "- Transferencia bancaria / Mercado Pago\n"
        "Tarjeta de Débuto y Crédito (Visa, Mastercard, American Express)\n\n"
        "_Nota: El pago en efectivo tiene 10% de descuento! 💸_"
    ),
    "cancelacion": (
        "ℹ️ *Políticas de Cancelación y Tolerancia:*\n\n"
        "• *Tolerancia:* Contamos con *15 minutos de tolerancia* por turno.\n"
        "• *Cancelación:* Podés cancelar o reprogramar tu turno sin costo con al menos *24hs de anticipación*.\n"
        "• En caso de avisar con menos de 24hs, comunicate directamente con nosotros para coordinar 💕\n"
        "• *Medicina de no asistencia:* Si no asistís sin avisar, el turno se considera perdido 💔"
    ),
    "tolerancia": (
        "⏰ *Tolerancia de Horario:*\n"
        "Tenemos una tolerancia de *15 minutos* para tu turno. "
        "Te pedimos puntualidad para brindar la mejor atención 💕"
    ),
    "estacionamiento": (
        "🚗 *Estacionamiento:*\n"
        "Contamos con estacionamiento medido sobre la avenida "
        "y un garage comercial a 50 metros sobre la calle Lavalle."
    ),
}


def get_faq_response(intent_key: str) -> Optional[str]:
    """Return static FAQ answer for recognized key."""
    return FAQ_KNOWLEDGE_BASE.get(intent_key)
