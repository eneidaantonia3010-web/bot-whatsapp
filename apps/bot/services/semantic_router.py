# ============================================
# Glow Studio by Sofia — Semantic Analytical Router
# Dynamic Entity Extraction, Digression Management & Context Return
# Powered by llama-3.1-8b-instant with deterministic rule fallback
# ============================================

import os
import json
import re
import logging
from dataclasses import dataclass, field
from typing import Optional, Any

from services.llm_pool import llm_pool
from services.prompts import SEMANTIC_ROUTER_PROMPT
from services.phone_utils import normalize_phone

logger = logging.getLogger("glow_bot.semantic_router")


@dataclass
class SemanticAnalysis:
    """Structured semantic analysis of an incoming user message."""
    intent: str = "OTHER"
    has_digression: bool = False
    digression_topic: Optional[str] = None
    change_of_mind: bool = False
    change_type: Optional[str] = None  # "service", "date", "both"
    services: list[str] = field(default_factory=list)
    date_time_text: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    raw_response: Optional[str] = None


# -- Heuristic Entity & Intent Extractors (Offline / Fast Fallback) --------

_CHANGE_MIND_PATTERNS = re.compile(
    r"\b(en realidad prefiero|mejor cambiame|mejor quiero|cambiar a|en vez de|"
    r"cambio de idea|cambie de idea|cambié de idea|mejor me hago|mejor haceme|"
    r"mejor el|mejor a las|prefiero cambiar|pasame a|pasalo a|mejor pasame|"
    r"pasame para|pasalo para|cambiame para|pasame al|pasalo al|mejor pasalo)\b",
    re.IGNORECASE,
)

_NAME_PATTERNS = [
    re.compile(r"(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){1,3})", re.IGNORECASE),
    re.compile(r"^([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,15}\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})$", re.IGNORECASE),
]

_PHONE_PATTERN = re.compile(
    r"(?:\+?54\s?9?\s?)?(?:11|15)?\s?(\d{4}[-\s]?\d{4}|\d{8,11})\b"
)

_DATE_TIME_PATTERNS = [
    re.compile(r"\b(hoy|mañana|pasado mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado)\b(?:\s+(?:a\s+las|a)?\s*(\d{1,2}(?::\d{2})?\s*(?:hs|hrs|am|pm)?))?", re.IGNORECASE),
    re.compile(r"\b(?:a\s+las|a)?\s*(\d{1,2}(?::\d{2})?\s*(?:hs|hrs))\b", re.IGNORECASE),
    re.compile(r"\b(\d{1,2}\s+de\s+[a-záéíóúñ]+(?:\s+a\s+las\s+\d{1,2}(?::\d{2})?)?)\b", re.IGNORECASE),
]

_DIGRESSION_PATTERNS = {
    "precios": re.compile(r"\b(cu[aá]nto sale|cu[aá]nto cuesta|lista de precios|precios? de los servicios|costos? de los servicios)\b", re.IGNORECASE),
    "pagos": re.compile(r"\b(c[oó]mo se paga|medios de pago|formas? de pago|tarjetas? aceptan|aceptan transferencia|aceptan mercado pago)\b", re.IGNORECASE),
    "ubicacion": re.compile(r"\b(d[oó]nde est[aá]n|d[oó]nde queda|ubicaci[oó]n|direcci[oó]n|c[oó]mo llego|mapa)\b", re.IGNORECASE),
    "horario": re.compile(r"\b(cu[aá]l es el horario|qu[eé] horario|horarios? de atenci[oó]n|a qu[eé] hora abren|a qu[eé] hora cierran|qu[eé] d[ií]as abren)\b", re.IGNORECASE),
    "cancelacion": re.compile(r"\b(pol[ií]tica de cancelaci[oó]n|pol[ií]ticas de cancelaci[oó]n|con cu[aá]nto tiempo se puede cancelar|penalidad por cancelar)\b", re.IGNORECASE),
    "servicios": re.compile(r"\b(qu[eé] servicios|cat[aá]logo de servicios|men[uú] de servicios|tratamientos tienen)\b", re.IGNORECASE),
}


def _extract_semantics_rules(
    message: str,
    stage: str,
    context: dict,
    available_services: list[dict],
) -> SemanticAnalysis:
    """Fast deterministic rule-based analysis used for speed or offline fallback."""
    clean_msg = message.strip()
    analysis = SemanticAnalysis()

    # 1. Detect Digression
    for topic, pattern in _DIGRESSION_PATTERNS.items():
        if pattern.search(clean_msg):
            if stage in ("service_selection", "date_selection", "name_input", "phone_input", "confirmation"):
                analysis.has_digression = True
                analysis.digression_topic = topic
                analysis.intent = "FAQ"
                break

    # 2. Detect Change of Mind
    if _CHANGE_MIND_PATTERNS.search(clean_msg):
        analysis.change_of_mind = True

    # 3. Extract Customer Name
    for np in _NAME_PATTERNS:
        match = np.search(clean_msg)
        if match:
            raw_name = match.group(1).strip()
            clean_tokens = re.split(
                r"\b(?:y|mi|quiero|para|por|con|del|de|el|la|un|una|cel|tel|telefono|whatsapp)\b",
                raw_name,
                flags=re.IGNORECASE,
            )
            candidate_name = clean_tokens[0].strip() if clean_tokens else raw_name
            if candidate_name and len(candidate_name) >= 2:
                if not any(w in candidate_name.lower() for w in ("corte", "uñas", "facial", "masaje", "turno", "hola", "gracias")):
                    analysis.customer_name = candidate_name.title()
                    break

    # 4. Extract Customer Phone
    phone_match = _PHONE_PATTERN.search(clean_msg)
    if phone_match:
        digits = re.sub(r"\D", "", phone_match.group(0))
        if len(digits) >= 8:
            analysis.customer_phone = digits

    # 5. Extract Services Mentioned
    # 5a. Direct catalog option number (e.g., "5", "opcion 5", "#5")
    opt_match = re.match(r"^(?:opci[oó]n\s*#?|#)?\s*([1-9]\d?)\.?$", clean_msg, re.IGNORECASE)
    if opt_match and available_services:
        opt_idx = int(opt_match.group(1))
        if 1 <= opt_idx <= len(available_services):
            matched_s = available_services[opt_idx - 1]
            if matched_s.get("name") and matched_s["name"] not in analysis.services:
                analysis.services.append(matched_s["name"])

    service_names = [s.get("name", "") for s in available_services if s.get("name")]
    msg_lower = clean_msg.lower()
    for s_name in service_names:
        s_lower = s_name.lower()
        key_terms = s_lower.split()
        if s_lower in msg_lower or any(len(term) >= 4 and term in msg_lower for term in key_terms):
            if s_name not in analysis.services:
                analysis.services.append(s_name)

    if "corte" in msg_lower and not any("corte" in s.lower() for s in analysis.services):
        analysis.services.append("Corte Signature")
    if "uña" in msg_lower and not any("uña" in s.lower() for s in analysis.services):
        analysis.services.append("Uñas Gel Luxury")
    if "facial" in msg_lower and not any("facial" in s.lower() for s in analysis.services):
        analysis.services.append("Facial Glow")
    if "keratina" in msg_lower and not any("keratina" in s.lower() for s in analysis.services):
        analysis.services.append("Anti-frizz Keratina")

    if analysis.services and stage in ("date_selection", "name_input", "phone_input", "confirmation"):
        analysis.change_of_mind = True
        analysis.change_type = "service"

    # 6. Extract Date & Time Expression
    for dt_p in _DATE_TIME_PATTERNS:
        dt_match = dt_p.search(clean_msg)
        if dt_match:
            analysis.date_time_text = dt_match.group(0).strip()
            if stage in ("name_input", "phone_input", "confirmation"):
                analysis.change_of_mind = True
                analysis.change_type = "both" if analysis.change_type == "service" else "date"
            elif analysis.change_of_mind:
                analysis.change_type = "both" if analysis.change_type == "service" else "date"
            break

    # 7. Intent classification
    if analysis.has_digression:
        analysis.intent = "FAQ"
    elif analysis.change_of_mind:
        analysis.intent = "CHANGE_MIND"
    elif analysis.services or analysis.date_time_text:
        analysis.intent = "BOOKING"

    return analysis


async def analyze_message_semantics_async(
    message: str,
    stage: str,
    context: dict,
    available_services: list[dict],
) -> SemanticAnalysis:
    """Analyze message using llama-3.1-8b-instant with resilient offline rule fallback."""
    rule_analysis = _extract_semantics_rules(message, stage, context, available_services)

    services_list = "\n".join(
        f"- {s.get('name')} (${s.get('price')}, {s.get('duration')} min)"
        for s in available_services
    ) or "- Corte Signature ($25000, 45 min)\n- Facial Glow ($35000, 60 min)\n- Uñas Gel Luxury ($28000, 75 min)"

    current_service = context.get("selected_service") or context.get("service")
    if isinstance(current_service, dict):
        current_service = current_service.get("name")
    current_service_str = str(current_service or "Ninguno")
    current_date_str = str(context.get("appointment_date") or "Ninguna")

    prompt = SEMANTIC_ROUTER_PROMPT.format(
        stage=stage or "greeting",
        current_service=current_service_str,
        current_date=current_date_str,
        services_list=services_list,
        message=message.strip(),
    )

    try:
        response_text = await llm_pool.get_semantic_completion_async(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1,
            max_tokens=250,
            timeout_sec=4,
        )

        if not response_text:
            return rule_analysis

        clean_json = response_text.strip()
        if "```" in clean_json:
            clean_json = re.sub(r"^```(?:json)?\s*", "", clean_json)
            clean_json = re.sub(r"\s*```$", "", clean_json)
        clean_json = clean_json.strip()

        data = json.loads(clean_json)

        slots = data.get("extracted_slots") or {}
        extracted_services = slots.get("services") or []
        if isinstance(extracted_services, str):
            extracted_services = [extracted_services]

        merged_services = list(dict.fromkeys(extracted_services + rule_analysis.services))
        merged_name = slots.get("customer_name") or rule_analysis.customer_name
        merged_phone = slots.get("customer_phone") or rule_analysis.customer_phone
        merged_date = slots.get("date_time_text") or rule_analysis.date_time_text

        has_digression = bool(data.get("has_digression") or rule_analysis.has_digression)
        digression_topic = data.get("digression_topic") or rule_analysis.digression_topic
        change_of_mind = bool(data.get("change_of_mind") or rule_analysis.change_of_mind)
        change_type = data.get("change_type") or rule_analysis.change_type

        intent = data.get("intent") or rule_analysis.intent
        if has_digression:
            intent = "FAQ"
        elif change_of_mind:
            intent = "CHANGE_MIND"

        return SemanticAnalysis(
            intent=intent,
            has_digression=has_digression,
            digression_topic=digression_topic,
            change_of_mind=change_of_mind,
            change_type=change_type,
            services=merged_services,
            date_time_text=merged_date,
            customer_name=merged_name,
            customer_phone=merged_phone,
            raw_response=response_text,
        )

    except Exception as err:
        logger.warning(f"Semantic router LLM parsing error: {err}. Using rule fallback.")
        return rule_analysis


# -- Contextual Return Bridging -------------------------------------------

def build_contextual_return_prompt(stage: str, context: dict, lang: str = "es") -> str:
    """
    Constructs a smooth, friendly bridge to guide the customer back
    to their current reservation step after answering a digression question.
    """
    service = context.get("selected_service") or context.get("service")
    service_name = service.get("name") if isinstance(service, dict) else (service or "tu servicio")
    date_str = context.get("appointment_date")
    customer_name = context.get("customer_name")

    if stage == "name_input":
        if date_str:
            return f"\n\nContinuando con tu reserva para *{service_name}* el *{date_str}*, ¿me dirías tu nombre completo para anotarte? 💕"
        return f"\n\nSiguiendo con tu reserva de *{service_name}*, ¿me pasás tu nombre completo para agendarte? 💕"

    elif stage == "date_selection":
        return f"\n\nPara continuar con tu turno de *{service_name}*, ¿qué día y horario te quedaría más cómodo? ✨"

    elif stage == "phone_input":
        name_prefix = f"a nombre de *{customer_name}*" if customer_name else ""
        return f"\n\nPara terminar de agendar tu turno de *{service_name}* {name_prefix}, ¿me pasás un número de teléfono de contacto? 📱"

    elif stage == "confirmation":
        return f"\n\nPara confirmar tu turno de *{service_name}* el *{date_str}*, ¿confirmás la reserva? (Respondé *SÍ* o *NO*) ✨"

    elif stage == "service_selection":
        return "\n\n¿Qué servicio te gustaría reservar hoy? Escribí el nombre o número ✨"

    return "\n\n¿En qué más te puedo ayudar con tu turno? 💕"
