# ============================================
# Salon FAQs Knowledge Base & Handler
# ============================================

from typing import Optional

FAQ_KNOWLEDGE_BASE = {
    "ubicacion": (
        "📍 *Nuestra Dirección:*\n"
        "Estamos ubicadas en *Av. Corrientes 1234, CABA*.\n"
        "⏰ Horarios: Lunes a Sábado de 9:00 a 19:00hs."
    ),
    "metodos_pago": (
        "💳 *Métodos de Pago Aceptados:*\n"
        "- Efectivo (10% de descuento ✨)\n"
        "- Transferencia bancaria / Mercado Pago\n"
        "- Tarjetas de Débito y Crédito"
    ),
    "cancelacion": (
        "ℹ️ *Políticas de Cancelación y Tolerancia:*\n"
        "• *Tolerancia:* Contamos con *15 minutos de tolerancia* de demora por turno.\n"
        "• *Cancelación:* Podés cancelar o reprogramar tu turno sin costo con al menos *24hs de anticipación*.\n"
        "• En caso de avisar con menos de 24hs, comunicate directamente con nosotros para coordinar 💕"
    ),
    "tolerancia": (
        "⏰ *Tolerancia de Horario:*\n"
        "Tenemos una tolerancia de *15 minutos* para tu turno. Te pedimos puntualidad para brindar la mejor atención 💕"
    ),

    "estacionamiento": (
        "🚗 *Estacionamiento:*\n"
        "Contamos con estacionamiento medido sobre la avenida y un garage comercial a 50 metros sobre la calle Lavalle."
    ),
}


def get_faq_response(intent_key: str) -> Optional[str]:
    """Return static FAQ answer for recognized key."""
    return FAQ_KNOWLEDGE_BASE.get(intent_key)
