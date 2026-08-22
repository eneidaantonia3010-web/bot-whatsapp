# ============================================
# Glow Studio by Sofia — Intent Classifier (improved)
# ============================================

from services.llm_pool import llm_pool
from services.prompts import INTENT_CLASSIFIER_PROMPT
import logging

logger = logging.getLogger("glow_bot.intent")

# Intents soportados
VALID_INTENTS = [
    "BOOKING",
    "CANCEL_APPOINTMENT",
    "RESCHEDULE_APPOINTMENT",
    "CONFIRM_APPOINTMENT",
    "FAQ_UBICACION",
    "FAQ_PAGOS",
    "FAQ_CANCELACION",
    "FAQ_HORARIO",
    "FAQ_SERVICIOS",
    "GREETING",
    "THANKS",
    "SMALL_TALK",
    "HUMAN_ESCALATION",
    "OTHER",
]


# ---- Reglas rápidas (zero-latency) ----

_GREETING_SET = frozenset({
    "hola", "holá", "holaa", "holaaa", "buenas", "buen día", "buen dia",
    "buenas tardes", "buenas noches", "buenas", "qué tal", "q tal",
    "oye", "oye hola", "saludos", "hola!", "holaa!", "hi", "hey",
})

_THANKS_SET = frozenset({
    "gracias", "graças", "graciasss", "gracias!", "mil gracias",
    "te amo", "las amo", "mil gracias!", "muchas gracias", "thanks",
    "thank you", "gracias youtube", "gracias humano",
})

_BOOKING_KEYWORDS = frozenset({
    "turno", "turnos", "reservar", "reserva", "quiero turno",
    "quiero reservar", "pedir turno", "pedir reserva", "agendar",
    "agendar turno", "hacer turno", "hacer reserva", "necesito turno",
    "necesito reserva", "pedir cita", "cita", "pedir una cita",
    "reservar cita", "turno para", "cita para", "hacer una cita",
    "tengo wona reservar", "yo quiero turno", "me gustaría reservar",
    "me gustaría turno", "podría turno", "podría reservar",
    "me pone un turno", "me das un turno", "un turno para",
    "una reserva para", "reserva de", "turno de",
})

_CANCEL_KEYWORDS = frozenset({
    "cancelar", "cancelo", "cancelar turno", "cancelar mi turno",
    "dar de baja", "anular", "anular turno", "borrar turno",
    "no voy a ir", "no puedo ir", "no asistiré", "no voy a asistir",
    "tengo que cancelar", "quiero cancelar", "cancelar cita",
    "cancelar la cita", "cancelar mi cita", "quiero cancelar turno",
    "baja el turno", "darme de baja", "borrar la reserva",
    "eliminar turno", "eliminar cita", "cancelar reserva",
    "baja mi turno", "cancelar lo que reservé",
})

_RESCHEDULE_KEYWORDS = frozenset({
    "reprogramar", "cambiar turno", "cambiar mi turno", "cambiar de turno",
    "cambiar horario", "cambiar la hora", "cambiar el día", "cambiar dia",
    "cambiar la fecha", "mover turno", "mover la cita", "postergar",
    "postergar turno", "pasar turno", "pasar la cita", "trasladar turno",
    "trasladar cita", "nuevo horario", "otro turno", "otro día para turno",
    "cambiar fecha", "cambiar día", "cambiar el turno",
    "me sirve otro turno", "quiero otro horario",
})

_UBICACION_KEYWORDS = frozenset({
    "dónde queda", "donde queda", "dónde están", "donde están",
    "dirección", "direccion", "ubicación", "ubicacion",
    "cómo llego", "como llego", "cómo llegar", "como llegar",
    "dirección completa", "cuál es la dirección", "cual es la direccion",
    "está cerca de", "está cerca", "está en", "queda en",
    "cerca de", "mapa", "google maps", "mostrar mapa",
})

_HORARIO_KEYWORDS = frozenset({
    "horario", "horarios", "cuándo están", "cuando estan",
    "qué horarios", "que horarios", "horario de atención",
    "horario de atencion", "cuándo abren", "cuando abren",
    "cuándo cierran", "cuando cierran", "abierto", "cerrado",
    "días que trabajas", "días que trabajan", "dias", "turnos disponibles",
    "cuándo me puedo", "cuando puedo venir", "cuándo puedo venir",
    "días de apertura", "días de atención",
})

_SERVICIOS_KEYWORDS = frozenset({
    "servicios", "servicio", "qué servicios", "que servicios",
    "qué hacen", "que hacen", "tipo de servicio", "tipo de servicios",
    "ofrecen", "ofrecen servicio", "precios", "precio",
    "cuánto cuesta", "cuanto cuesta", "costos", "precios de servicios",
    "cuánto cuestan", "servicios disponibles", "tenés servicio de",
    "tenés servicios de", "hacen", "trabajas servicio",
})

_PAYMENT_KEYWORDS = frozenset({
    "pago", "pagos", "pagar", "como pagar", "cómo pagar",
    "métodos de pago", "metodos de pago", "medios de pago",
    "aceptan tarjeta", "aceptan tarjetas", "efectivo",
    "tarjeta", "tarjetas", "transferencia", "transferencia bancaria",
    "mercadopago", "mercado pago", "cheque", "cheques",
    "plata", "dinero", "cuánto sale", "cuanto sale",
    "descuento", "descuentos", "oferta", "ofertas",
})

_CANCELACION_POLICIA_KEYWORDS = frozenset({
    "política de cancelación", "politica de cancelacion",
    "políticas de cancelación", "politicas de cancelacion",
    "con cuánto tiempo", "con cuanto tiempo", "aviso",
    "tolerancia", "tolerancia de tiempo", "cuánto esperan",
    "cuanto esperan", "si llego tarde", "llego tarde",
    "atraso", "retraso", "demora", "tardé", "tarde",
})

_HUMAN_ESCALATION_KEYWORDS = frozenset({
    "hablar con alguien", "hablar con una persona", "hablar con sofia",
    "hablar con sofía", "quiero hablar con alguien", "quiero hablar con una persona",
    "operador", "operadora", "humano", "persona real", "agente",
    "no me entendés", "no me entiende", "no entiendo nada",
    "ayuda real", "ayuda humana", "asistente real",
    "talk to someone", "real person", "human agent",
    "falar com alguém", "pessoa real", "atendente",
    "quiero un humano", "pasame con alguien", "pasame con sofia",
    "necesito hablar con alguien",
})


def _classify_by_rules(text: str) -> str | None:
    """Clasificación rápida basada en reglas deterministas."""
    t = text.lower().strip()

    # THANKS tiene prioridad sobre GREETING
    if any(w in t for w in _THANKS_SET):
        return "THANKS"

    # Saludos simples
    if t in _GREETING_SET:
        return "GREETING"
    if any(t.startswith(g) for g in _GREETING_SET):
        return "GREETING"

    # CANCEL_APPOINTMENT
    if any(w in t for w in _CANCEL_KEYWORDS):
        return "CANCEL_APPOINTMENT"

    # RESCHEDULE_APPOINTMENT
    if any(w in t for w in _RESCHEDULE_KEYWORDS):
        return "RESCHEDULE_APPOINTMENT"

    # CONFIRM_APPOINTMENT
    if any(w in t for w in ("confirmo", "confirmar", "voy a ir", "voy a venir",
                               "ahí estaré", "ahi estare", "asistiré", "asistire",
                               "iré", "ire", "me presento", "me voy a presentar")):
        return "CONFIRM_APPOINTMENT"

    # FAQ ubicación
    if any(w in t for w in _UBICACION_KEYWORDS):
        return "FAQ_UBICACION"

    # FAQ horarios
    if any(w in t for w in _HORARIO_KEYWORDS):
        return "FAQ_HORARIO"

    # FAQ servicios / precios
    if any(w in t for w in _SERVICIOS_KEYWORDS):
        return "FAQ_SERVICIOS"

    # FAQ pagos
    if any(w in t for w in _PAYMENT_KEYWORDS):
        return "FAQ_PAGOS"

    # FAQ cancelación
    if any(w in t for w in _CANCELACION_POLICIA_KEYWORDS):
        return "FAQ_CANCELACION"

    # HUMAN_ESCALATION
    if any(w in t for w in _HUMAN_ESCALATION_KEYWORDS):
        return "HUMAN_ESCALATION"

    # BOOKING: keywords de dese o reserva
    if any(w in t for w in _BOOKING_KEYWORDS):
        return "BOOKING"

    return None


def classify_intent(message: str) -> str:
    """
    Clasifica el mensaje del cliente en una de las categorías soportadas.

    Prioridad:
      1. Reglas rápidas (keywords, sets)
      2. LLM con prompt few-shot (para casos ambiguos)
      3. Default: OTHER
    """
    text = message.lower().strip()

    # Fast path: reglas deterministas
    rule_result = _classify_by_rules(text)
    if rule_result:
        return rule_result

    # LLM classification fallback (puede ser costoso, usar con moderación)
    try:
        prompt = INTENT_CLASSIFIER_PROMPT.replace("{message}", message)
        raw_res = llm_pool.get_completion([], system_msg=prompt)
        if raw_res:
            cleaned = raw_res.strip().upper()
            for v in VALID_INTENTS:
                if v in cleaned:
                    logger.info(f"Intent LYY classified as {v}: {message[:50]}")
                    return v
    except Exception as e:
        logger.warning(f"Intent classification LLM failed: {e}")

    # Si todo falla, algo general
    return "OTHER"
