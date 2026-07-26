# ============================================
# Intent Classifier Service
# ============================================

import os
from groq import Groq


def classify_intent(message: str) -> str:
    """
    Classify user message intent into one of:
    - BOOKING (booking/service request)
    - FAQ_UBICACION (location/address inquiry)
    - FAQ_PAGOS (payment methods)
    - FAQ_CANCELACION (cancellation policies)
    - GREETING (casual greeting)
    - OTHER (general question)
    """
    text = message.lower().strip()

    # Fast pattern matching for simple FAQs
    if any(w in text for w in ["donde quedan", "donde estan", "direccion", "ubicacion", "como llego", "donde queda"]):
        return "FAQ_UBICACION"
    if any(w in text for w in ["como puedo pagar", "metodos de pago", "aceptan tarjeta", "mercadopago", "efectivo", "medios de pago"]):
        return "FAQ_PAGOS"
    if any(w in text for w in ["politica de cancelacion", "con cuanto tiempo aviso", "como cancelo", "tolerancia", "cuanto esperan", "si llego tarde"]):
        return "FAQ_CANCELACION"


    # LLM classification fallback for ambiguity
    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", "").split(",") if k.strip()]

    if not groq_keys:
        return "BOOKING"

    prompt = (
        f"Clasificá el siguiente mensaje del cliente de un salón de belleza en exactamente UNA categoría:\n"
        f"CATEGORÍAS: [BOOKING, FAQ_UBICACION, FAQ_PAGOS, FAQ_CANCELACION, GREETING, OTHER]\n\n"
        f"Mensaje: '{message}'\n\n"
        f"Responde ÚNICAMENTE con la palabra de la categoría."
    )

    for key in groq_keys:
        try:
            client = Groq(api_key=key)
            comp = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant"
            )
            result = comp.choices[0].message.content.strip().upper()
            if result in ["BOOKING", "FAQ_UBICACION", "FAQ_PAGOS", "FAQ_CANCELACION", "GREETING", "OTHER"]:
                return result
        except Exception:
            continue

    return "BOOKING"
