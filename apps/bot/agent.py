# ============================================
# Glow Studio by Sofia — Improved AI Agent
# ============================================

import os
import json
import re
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
import pytz

import dateparser

try:
    from config import SALON_WHATSAPP, API_URL, API_SECRET_KEY
except ImportError:
    SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5491178296781")
    API_URL = os.getenv("API_URL", "https://glow-studio-api-2vzt.onrender.com")
    API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")

from services.database import (
    get_services,
    get_service_by_name,
    get_service_by_index,
    get_conversation_state,
    save_conversation_state,
    delete_conversation_state,
    get_customer_history,
    get_gallery_image_for_category,
    get_customer_preferences,
)
from services.calendar import (
    create_appointment_via_api,
    get_availability,
    get_smart_availability,
    get_upcoming_appointments,
    confirm_upcoming_appointment,
    cancel_appointment,
    reschedule_appointment,
    add_to_waitlist_via_api,
)
from services.whatsapp import send_whatsapp_notification
from services.phone_utils import normalize_phone
from services.llm_pool import llm_pool
from services.faq_handler import get_faq_response
from services.intent_classifier import (
    classify_intent,
    classify_intent_with_confidence,
    classify_intent_with_confidence_async,
    CONFIDENCE_THRESHOLD,
)
from services.language_detector import detect_language, t
from services.escalation import escalate_to_human, build_escalation_summary
from services.memory import (
    format_memory_system_context,
    remember_preference,
    extract_and_remember_preferences,
    detect_cross_sell_opportunity,
)
from services.admin_commands import handle_admin_command
from services.prompts import (
    SERVICE_HELP_PROMPT,
    DATE_CLARIFICATION_PROMPT,
    GENERAL_FALLBACK_PROMPT,
    BOOKING_EXTRACTION_PROMPT,
    MULTI_SERVICE_EXTRACTION_PROMPT,
    SYSTEM_PERSONALITY_MAP,
    OBJECTION_HANDLING_PROMPT,
    CROSS_SELL_PROMPT,
)
from services.formatters import (
    format_services_catalog,
    format_appointment_datetime,
    _format_date_display,
    _format_price,
    _is_close_confirmation_answer,
    _apply_output_guardrails,
)
from services.semantic_router import (
    analyze_message_semantics_async,
    build_contextual_return_prompt,
    SemanticAnalysis,
)

logger = logging.getLogger("glow_bot.agent")
TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")

RIOPLATENSE_GREETING_PROMPT = (
    "\n[Instrucción de Saludo Rioplatense: Tu saludo inicial debe ser sumamente cálido, cariñoso, dulce y cercano en auténtico español rioplatense "
    "(ej: '¡Hola, hermosa! 💕 ¡Qué lindo que nos escribas! Bienvenida a Glow Studio ✨'). Hacé sentir a cada clienta única, mimada y bienvenida con la mayor calidez porteña.]"
)

# In-memory conversation state cache and per-sender locks
conversations: dict[str, dict] = {}
_sender_locks: dict[str, asyncio.Lock] = {}



def _get_sender_lock(sender_id: str) -> asyncio.Lock:
    # Periodically prune unused locks to prevent memory leaks
    if len(_sender_locks) > 1000:
        idle = [s for s, lock in _sender_locks.items() if not lock.locked()]
        for s in idle[:500]:
            _sender_locks.pop(s, None)
    if sender_id not in _sender_locks:
        _sender_locks[sender_id] = asyncio.Lock()
    return _sender_locks[sender_id]


# ── Helpers ──────────────────────────────────────────────────────────────


def get_conversation(sender_id: str) -> dict:
    """Get or create conversation state for a sender, checking in-memory RAM cache first."""
    if sender_id in conversations:
        return conversations[sender_id]

    db_state = get_conversation_state(sender_id)
    if db_state:
        db_state.setdefault("phone_confirmed", False)
        conversations[sender_id] = db_state
        return db_state

    new_state = {
        "stage": "greeting",
        "selected_service": None,
        "selected_services": [],
        "selected_date": None,
        "selected_time": None,
        "customer_name": None,
        "customer_phone": None,
        "phone_confirmed": False,
        "chat_history": [],
        "language": "es",
        "last_message_at": datetime.now(TZ_AR).isoformat(),
        "fallback_count": 0,
        "low_confidence_count": 0,
        "cancelling_apt": None,
        "rescheduling_apt": None,
        "upcoming_apts": [],
        "reference_notes": None,
        "awaiting_continuity": False,
        "pending_continuity_service": None,
    }
    conversations[sender_id] = new_state
    return new_state


async def _parse_message_with_llm(message: str, history: list[dict]) -> dict:
    """Use LLM with recent history to extract service name + date from a booking message."""
    prompt = BOOKING_EXTRACTION_PROMPT.replace("{message}", message)
    try:
        raw = await llm_pool.get_completion_async(
            messages=history[-4:],
            system_msg=prompt,
            model="llama-3.1-8b-instant",
            max_tokens=100,
            timeout_sec=5,
        )
        if raw:
            raw = raw.strip()
            json_start = raw.find("{")
            json_end = raw.rfind("}")
            if json_start >= 0 and json_end >= 0:
                data = json.loads(raw[json_start:json_end + 1])
                return {"servicio": data.get("servicio"), "fecha": data.get("fecha")}
    except Exception as e:
        logger.warning(f"Booking extraction LLM failed: {e}")
    return {"servicio": None, "fecha": None}


async def _parse_multi_service(message: str, services: list[dict], history: list[dict]) -> dict:
    """Use LLM to extract MULTIPLE service names + date from a message."""
    services_list = "\n".join([f"  - {s['name']}" for s in services])
    prompt = MULTI_SERVICE_EXTRACTION_PROMPT.replace("{services_list}", services_list).replace("{message}", message)
    try:
        raw = await llm_pool.get_completion_async(
            messages=history[-4:],
            system_msg=prompt,
            model="llama-3.1-8b-instant",
            max_tokens=150,
            timeout_sec=6,
        )
        if raw:
            raw = raw.strip()
            json_start = raw.find("{")
            json_end = raw.rfind("}")
            if json_start >= 0 and json_end >= 0:
                data = json.loads(raw[json_start:json_end + 1])
                return {
                    "servicios": data.get("servicios", []),
                    "fecha": data.get("fecha"),
                }
    except Exception as e:
        logger.warning(f"Multi-service extraction failed: {e}")
    return {"servicios": [], "fecha": None}


async def _get_compact_smart_slots(service_id: str, max_slots: int = 3) -> tuple[str, list[str]]:
    """
    Obtiene hasta max_slots horarios optimizados mediante Smart Gaps.
    Prioriza hoy (si hay disponibilidad antes del cierre) y luego mañana.
    Retorna (label_dia, lista_horarios), ej: ("hoy", ["14:30", "16:00", "18:30"]).
    """
    try:
        now_ar = datetime.now(TZ_AR)
        today_str = now_ar.strftime("%Y-%m-%d")

        # 1. Intentar con hoy
        smart_today = await get_smart_availability(today_str, service_id, limit=max_slots)
        if smart_today:
            rec_slots = [
                s.get("time") for s in smart_today.get("recommendedSlots", [])
                if isinstance(s, dict) and s.get("time")
            ]
            all_avail = [
                s.get("time") for s in smart_today.get("slots", [])
                if isinstance(s, dict) and s.get("available") and s.get("time") not in rec_slots
            ]
            combined = [t for t in (rec_slots + all_avail) if t][:max_slots]
            if combined:
                return ("hoy", combined)

        # 2. Si hoy no hay cupos o ya cerró, intentar con mañana
        tomorrow_dt = now_ar + timedelta(days=1)
        tomorrow_str = tomorrow_dt.strftime("%Y-%m-%d")
        smart_tomorrow = await get_smart_availability(tomorrow_str, service_id, limit=max_slots)
        if smart_tomorrow:
            rec_slots = [
                s.get("time") for s in smart_tomorrow.get("recommendedSlots", [])
                if isinstance(s, dict) and s.get("time")
            ]
            all_avail = [
                s.get("time") for s in smart_tomorrow.get("slots", [])
                if isinstance(s, dict) and s.get("available") and s.get("time") not in rec_slots
            ]
            combined = [t for t in (rec_slots + all_avail) if t][:max_slots]
            if combined:
                return ("mañana", combined)

        # 3. Fallback a get_availability normal
        avail_today = await get_availability(today_str, service_id)
        if avail_today:
            avail_slots = [s["time"] for s in avail_today if s.get("available")][:max_slots]
            if avail_slots:
                return ("hoy", avail_slots)

        avail_tom = await get_availability(tomorrow_str, service_id)
        if avail_tom:
            avail_slots = [s["time"] for s in avail_tom if s.get("available")][:max_slots]
            if avail_slots:
                return ("mañana", avail_slots)

    except Exception as e:
        logger.warning(f"Error fetching compact smart slots: {e}")

    return ("", [])


def _strip_accents(text: str) -> str:
    import unicodedata
    return "".join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )


def _has_name_rejection_tokens(text: Optional[str]) -> bool:
    """Check if the text contains temporal connectors, negations, numbers, or verbs that make it invalid as a personal name."""
    if not text or not isinstance(text, str):
        return True
    clean = text.strip()
    if len(clean) < 2 or len(clean) > 40:
        return True
    # Reject if it contains any digits (e.g. '12', '1166496150', 'martes 12')
    if any(c.isdigit() for c in clean):
        return True

    clean_norm = _strip_accents(clean)

    # Multi-word invalid expressions
    invalid_phrases = [
        "no quiero", "no puedo", "no llego", "no me sirve", "no voy", "no me gusta",
        "en vez de", "en realidad", "a las", "de la tarde", "de la manana",
        "de la noche", "pasado manana", "cambiar horario", "cambiar turno",
        "cambiar fecha", "cambiar dia", "otro dia", "otra fecha", "otro horario",
        "otra hora", "lista de espera", "me maree", "nombre completo",
        "este mismo", "el mismo", "deja este", "usa este", "el de aca", "la misma"
    ]
    for phrase in invalid_phrases:
        if phrase in clean_norm:
            return True

    words = clean.split()
    if len(words) > 4:
        return True

    rejection_tokens = {
        # Conectores de tiempo / días / meses / referencias temporales
        "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo",
        "hoy", "manana", "ayer", "pasado", "tarde", "noche", "dia", "dias", "mediodia", "temprano",
        "hora", "horario", "horarios", "fecha", "fechas", "hs", "hrs", "am", "pm",
        "semana", "mes", "turno", "turnos",
        "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
        "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        # Negaciones
        "no", "nop", "tampoco", "nunca", "jamas", "ni",
        # Conectores / preposiciones
        "sino", "pero", "para", "del", "al", "hacia", "hasta", "desde",
        # Verbos / acciones
        "quiero", "queria", "querre", "prefiero", "preferiria", "cambiar", "cambio",
        "cambiame", "cambia", "cambie", "pasar", "pasame", "pasa", "pasalo",
        "reservar", "reserva", "reservame", "agendar", "agenda", "agendame",
        "modificar", "dejar", "deja", "dejame", "hacer", "haceme", "hago",
        "ver", "ir", "voy", "llego", "llegar", "puedo", "podria", "confirmar",
        "confirmo", "cancelar", "cancelo", "averiguar", "consultar",
        # Palabras numéricas
        "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
        "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho",
        "diecinueve", "veinte", "veintiuno", "veintidos", "veintitres", "veinticuatro",
        "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve", "treinta",
        # Navegación y generales
        "menu", "inicio", "hola", "chau", "gracias", "precio", "costo", "cuanto", "vale",
        "disponible", "disponibilidad", "servicio", "servicios", "ok", "dale", "si",
        "bien", "mejor", "otro", "otra", "otros", "otras",
        # Demostrativos y confirmaciones de contacto
        "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella",
        "mismo", "misma", "mismos", "mismas", "aca", "alla", "ahi"
    }

    norm_words = [_strip_accents(re.sub(r'[^\w\s]', '', w)) for w in words]
    if any(w in rejection_tokens for w in norm_words):
        return True

    return False


def _is_valid_customer_name(name: Optional[str], services_catalog: Optional[list] = None) -> bool:
    """Validate that a candidate string is a legitimate personal name and not a conversational phrase, date or command."""
    if not name or not isinstance(name, str):
        return False
    clean = name.strip()
    if _has_name_rejection_tokens(clean):
        return False

    clean_norm = _strip_accents(clean)
    if services_catalog:
        for s in services_catalog:
            s_norm = _strip_accents(s.get("name", ""))
            if clean_norm == s_norm or s_norm in clean_norm or clean_norm in s_norm:
                return False

    if not re.match(r"^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\.'\-]+$", clean):
        return False

    return True


async def _filter_name_with_llama(text: str, history: list[dict] = None) -> tuple[bool, Optional[str]]:
    """Strict LLaMA validator for personal customer names."""
    clean = text.strip()
    if _has_name_rejection_tokens(clean):
        return False, None

    prompt = (
        "Analizá el siguiente texto para una reserva en el salón de belleza Glow Studio:\n"
        f'"""{clean}"""\n\n'
        "Determiná si el texto corresponde ÚNICAMENTE al nombre y apellido propio de una persona física (ej: 'Camila Perez', 'Florencia Gomez', 'Soy Sofia Rossi').\n"
        "Reglas estrictas:\n"
        "- Si contiene negaciones ('no', 'tampoco'), días o referencias de tiempo ('martes', 'miércoles', 'hoy', 'mañana'), horarios ('a las 12', '14hs'), verbos ('quiero', 'cambiar', 'prefiero'), números o frases como 'no quiero para el martes', es_valido DEBE SER false y nombre null.\n"
        "- Si es un nombre propio legítimo (ej: 'Camila Gomez', 'Luciana Torres', 'María Fernández'), es_valido DEBE SER true y nombre el nombre capitalizado.\n"
        "- Responde ÚNICAMENTE un JSON estricto: {\"es_valido\": true/false, \"nombre\": \"<nombre limpio capitalizado o null>\"}\n"
        "No agregues explicaciones fuera del JSON."
    )
    try:
        raw = await llm_pool.get_completion_async(
            messages=[{"role": "user", "content": f'Texto a analizar: "{clean}"'}],
            system_msg=prompt,
            model="llama-3.1-8b-instant",
            max_tokens=60,
            timeout_sec=4,
        )
        if raw:
            raw = raw.strip()
            j_start = raw.find("{")
            j_end = raw.rfind("}")
            if j_start >= 0 and j_end >= 0:
                data = json.loads(raw[j_start:j_end + 1])
                is_valid = bool(data.get("es_valido"))
                cleaned_name = data.get("nombre")
                if is_valid and cleaned_name and not _has_name_rejection_tokens(cleaned_name):
                    return True, cleaned_name.strip().title()
                if not is_valid:
                    return False, None
    except Exception as e:
        logger.warning(f"LLaMA name validation failed: {e}")

    # Fallback to deterministic check
    name_clean = re.sub(r"^(?:hola\s+|buenas\s+)?(?:me llamo|mi nombre es|soy)\s+", "", clean, flags=re.IGNORECASE).strip()
    if not _has_name_rejection_tokens(name_clean) and _is_valid_customer_name(name_clean):
        return True, name_clean.title()

    return False, None


def parse_date(text: str) -> tuple[str, str] | None:
    """Parse human date/time from Spanish text into (YYYY-MM-DD, HH:MM)."""
    norm_text = _strip_accents(text.strip())
    now_ar = datetime.now(TZ_AR)
    today = now_ar.date()

    day_map = {
        "lunes": 0, "martes": 1, "miercoles": 2,
        "jueves": 3, "viernes": 4, "sabado": 5,
    }

    # 1. Extract time (e.g. "a las 11", "a las 11 de la manana", "14hs", "16:30", "6 de la tarde", "10am")
    hour = None
    minute = 0

    colon_match = re.search(r"(\d{1,2}):(\d{2})", norm_text)
    period_match = re.search(
        r"(?:a\s+las\s+)?(\d{1,2})\s*(?:hs|hrs|h)?\s*(de\s+la\s+tarde|de\s+la\s+manana|de\s+la\s+noche|am|pm)",
        norm_text
    )
    unit_match = re.search(r"(?:a\s+las\s+(\d{1,2})|(\d{1,2})\s*(?:hs|hrs|h))", norm_text)

    if colon_match:
        hour = int(colon_match.group(1))
        minute = int(colon_match.group(2))
        if 1 <= hour <= 11 and any(w in norm_text for w in ("tarde", "noche", "pm")):
            hour += 12
    elif period_match:
        raw_h = int(period_match.group(1))
        qualifier = period_match.group(2).strip()
        if "tarde" in qualifier or "noche" in qualifier or qualifier == "pm":
            hour = raw_h + 12 if raw_h < 12 else raw_h
        elif "manana" in qualifier or qualifier == "am":
            hour = raw_h if raw_h != 12 else 0
        else:
            hour = raw_h + 12 if 1 <= raw_h <= 7 else raw_h
    elif unit_match:
        raw_h = int(unit_match.group(1) or unit_match.group(2))
        hour = raw_h + 12 if 1 <= raw_h <= 7 else raw_h

    target_date = None

    is_hoy = bool(re.search(r"\bhoy\b", norm_text) or "today" in norm_text)
    is_pasado_manana = bool(re.search(r"pasado\s*ma.?ana", norm_text) or "pasadomanana" in norm_text)
    is_manana = bool(not is_pasado_manana and (re.search(r"(?<!de la\s)(?<!por la\s)\bma.?ana\b", norm_text) or "tomorrow" in norm_text))

    matched_day_num = None
    day_matches = []
    for day_name, day_num in day_map.items():
        for m in re.finditer(rf"\b{day_name}\b", norm_text):
            day_matches.append((m.start(), day_name, day_num))
    if day_matches:
        day_matches.sort(key=lambda x: x[0])
        matched_day_num = day_matches[-1][2]

    if is_hoy:
        target_date = today
    elif is_pasado_manana:
        target_date = today + timedelta(days=2)
    elif is_manana:
        target_date = today + timedelta(days=1)
    elif matched_day_num is not None:
        if matched_day_num == today.weekday():
            # Current day of the week requested: if hour is later today, it's today
            if hour is not None and (hour, minute) > (now_ar.hour, now_ar.minute):
                target_date = today
            else:
                target_date = today + timedelta(days=7)
        elif matched_day_num > today.weekday():
            days_ahead = matched_day_num - today.weekday()
            target_date = today + timedelta(days=days_ahead)
        else:
            days_ahead = (matched_day_num - today.weekday()) + 7
            target_date = today + timedelta(days=days_ahead)


    if target_date and hour is not None:
        if target_date.weekday() == 6:  # Sunday
            return None
        if 9 <= hour <= 19:
            date_str = target_date.strftime("%Y-%m-%d")
            time_str = f"{hour:02d}:{minute:02d}"
            return date_str, time_str

    # Dateparser fallback
    try:
        parsed_dt = dateparser.parse(
            text,
            languages=["es"],
            settings={
                "RELATIVE_BASE": datetime.now(TZ_AR),
                "PREFER_DATES_FROM": "future",
                "TIMEZONE": "America/Argentina/Buenos_Aires",
                "RETURN_AS_TIMEZONE_AWARE": True,
            },
        )
        if parsed_dt:
            if parsed_dt.weekday() == 6:
                return None
            if 9 <= parsed_dt.hour <= 19:
                return parsed_dt.strftime("%Y-%m-%d"), parsed_dt.strftime("%H:%M")
    except Exception as e:
        logger.warning(f"dateparser exception: {e}")

    return None


# ── Main Processing ──────────────────────────────────────────────────────


async def process_message(
    sender_id: str,
    message: str,
    platform: str = "INSTAGRAM",
) -> str | dict:
    """Process an incoming message with per-sender concurrency lock."""
    lock = _get_sender_lock(sender_id)
    async with lock:
        return await _process_message_internal(sender_id, message, platform)


async def _process_message_internal(
    sender_id: str,
    message: str,
    platform: str = "INSTAGRAM",
) -> str | dict:
    """Internal message processing logic."""
    try:
        # STEP 0: Admin Commands Check (Only for authorized salon administrator phone)
        if message.strip().startswith("/"):
            admin_reply = await handle_admin_command(sender_id, message.strip())
            if admin_reply:
                return admin_reply

        conv = get_conversation(sender_id)
        chat_history = conv["chat_history"]
        clean_msg = message.strip().lower()
        clean_msg_strip = message.strip()

        # Continuous Language Detection
        lang = conv.get("language", "es")
        detected_lang = detect_language(message)
        if detected_lang != lang and detected_lang in ("pt", "en"):
            lang = detected_lang
            conv["language"] = lang

        # Image reference detection & tagging
        if "[Imagen:" in message or "[La clienta envió una imagen:" in message or "[Foto:" in message:
            conv["reference_notes"] = message
            logger.info(f"Tagged reference photo for {sender_id}")

        # Session Freshness & Welcome Back (without swallowing user message)
        welcome_back_prefix = ""
        last_msg_str = conv.get("last_message_at")
        if last_msg_str and conv["stage"] != "greeting":
            try:
                last_msg_dt = datetime.fromisoformat(last_msg_str)
                if last_msg_dt.tzinfo is None:
                    last_msg_dt = TZ_AR.localize(last_msg_dt)
                elapsed = (datetime.now(TZ_AR) - last_msg_dt).total_seconds()

                if elapsed > 86400:  # > 24 hours — session expired
                    conversations.pop(sender_id, None)
                    delete_conversation_state(sender_id)
                    conv = get_conversation(sender_id)
                    conv["language"] = lang
                    chat_history = conv["chat_history"]
                elif elapsed > 300:  # > 5 minutes — welcome back with context
                    service = conv.get("selected_service")
                    if service and conv["stage"] not in ("greeting", "human_escalated"):
                        welcome_back_prefix = t("welcome_back", lang, service=service.get("name", "tu servicio")) + "\n\n"
                        conv["awaiting_continuity"] = True
                        conv["pending_continuity_service"] = service
            except Exception as e:
                logger.warning(f"Error checking session freshness: {e}")

        conv["last_message_at"] = datetime.now(TZ_AR).isoformat()
        chat_history.append({"role": "user", "parts": [message]})

        # Sanitize customer_name if corrupt in state
        services_catalog = get_services()
        if conv.get("customer_name") and not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
            logger.warning(f"Purging invalid customer_name from conversation state: {conv.get('customer_name')}")
            conv["customer_name"] = None
        conv.setdefault("phone_confirmed", False)

        # Check if conversation is PAUSED for human intervention
        if conv.get("stage") in ("PAUSED", "human_escalated"):
            clean_check = message.strip().lower()
            if any(w in clean_check for w in ("hola", "inicio", "reset", "menu", "menú", "bot", "empezar", "reiniciar")):
                conv["stage"] = "greeting"
                conv["fallback_count"] = 0
                conv["low_confidence_count"] = 0
            else:
                response = t("human_notified", lang) + "\n\n_💡 Si preferís volver al asistente virtual, escribí *menu* o *hola*._"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

        # Inyectar memoria semántica de clienta
        clean_phone = normalize_phone(conv.get("customer_phone") or sender_id)
        if clean_phone:
            extract_and_remember_preferences(clean_phone, message)
        memory_context = format_memory_system_context(clean_phone)
        system_personality = (
            SYSTEM_PERSONALITY_MAP.get(lang, SYSTEM_PERSONALITY_MAP["es"])
            + memory_context
            + (RIOPLATENSE_GREETING_PROMPT if conv.get("stage") == "greeting" else "")
        )

        # STEP 1: Intent Classification with Confidence Scoring (Non-blocking async)
        intent, confidence = await classify_intent_with_confidence_async(message)
        logger.info(f"Intent classified for {sender_id}: {intent} (confidence={confidence:.2f})")

        # STEP 1.5: Deep Semantic Analysis & Dynamic Entity Extraction (llama-3.1-8b-instant + rule fallback)
        services_catalog = get_services()
        semantic_analysis = await analyze_message_semantics_async(
            message=message,
            stage=conv.get("stage", "greeting"),
            context=conv,
            available_services=services_catalog,
        )
        logger.info(
            f"Semantic analysis for {sender_id}: intent={semantic_analysis.intent}, "
            f"digression={semantic_analysis.has_digression} ({semantic_analysis.digression_topic}), "
            f"change={semantic_analysis.change_of_mind} ({semantic_analysis.change_type}), "
            f"slots(services={semantic_analysis.services}, date={semantic_analysis.date_time_text}, "
            f"name={semantic_analysis.customer_name}, phone={semantic_analysis.customer_phone})"
        )

        # Update long-term memory and conversation context with extracted slots
        if (
            semantic_analysis.customer_name
            and len(semantic_analysis.customer_name) >= 2
            and _is_valid_customer_name(semantic_analysis.customer_name, services_catalog)
            and (not conv.get("customer_name") or conv.get("stage") in ("name_input", "name_selection"))
        ):
            candidate_name = semantic_analysis.customer_name.strip()
            conv["customer_name"] = candidate_name
            if clean_phone:
                remember_preference(clean_phone, "nombre", candidate_name)

        if semantic_analysis.customer_phone:
            candidate_phone = normalize_phone(semantic_analysis.customer_phone)
            if candidate_phone:
                conv["customer_phone"] = candidate_phone
                if clean_phone:
                    remember_preference(clean_phone, "telefono", candidate_phone)
                clean_phone = candidate_phone

        # Track consecutive low-confidence classifications (ignore standard navigation words and form input stages)
        in_data_input_stage = conv.get("stage") in ("date_selection", "name_input", "name_selection", "phone_input")
        clean_msg_nav = message.strip().lower()
        is_safe_word = any(
            w in clean_msg_nav
            for w in (
                "hola", "inicio", "reset", "menu", "menú", "bot", "empezar", "reiniciar",
                "reservar", "turno", "servicios", "no", "nop", "si", "sí", "ok", "dale",
                "bueno", "listo", "gracias", "chau", "perfecto", "genial", "cancelar"
            )
        )
        if (
            semantic_analysis.has_digression
            or semantic_analysis.change_of_mind
            or semantic_analysis.customer_name
            or semantic_analysis.customer_phone
            or semantic_analysis.services
            or semantic_analysis.date_time_text
        ):
            is_safe_word = True

        if not is_safe_word and not in_data_input_stage and (confidence < CONFIDENCE_THRESHOLD or intent == "UNKNOWN"):
            conv["low_confidence_count"] = conv.get("low_confidence_count", 0) + 1
            logger.info(f"Low confidence count for {sender_id}: {conv['low_confidence_count']}")
        elif not in_data_input_stage:
            conv["low_confidence_count"] = 0

        # EXPERT HUMAN ESCALATION & PAUSED STATE TRIGGER:
        # Triggered by explicit operator request OR 2 consecutive low-confidence classifications OUTSIDE form input
        if intent == "HUMAN_ESCALATION" or (not in_data_input_stage and conv.get("low_confidence_count", 0) >= 2):
            conv["stage"] = "PAUSED"
            sender_name = conv.get("customer_name") or f"Cliente ({sender_id[-4:] if len(sender_id)>=4 else sender_id})"
            summary = build_escalation_summary(conv, message)
            await escalate_to_human(sender_id, sender_name, summary, message)
            response = t("human_escalation", lang)
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # STEP 2: Handle thanks and small talk
        if intent == "THANKS":
            conv["fallback_count"] = 0
            services = get_services()
            catalog = format_services_catalog(services)
            response = (
                "¡De nada! 💕 Si querés reservar un turno, "
                "decime qué servicio te interesa y te lo encuentro ✨\n\n"
                f"{catalog}"
            )
            chat_history.append({"role": "model", "parts": [response]})
            conv["stage"] = "service_selection"
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        if intent == "SMALL_TALK":
            conv["fallback_count"] = 0
            response = (
                "¡Qué lindo! 💕 ¿Querés reservar un turno? "
                "Decime qué servicio te gusta y te lo encontramos ✨"
            )
            chat_history.append({"role": "model", "parts": [response]})
            conv["stage"] = "service_selection"
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # STEP 3: Intent Interception
        flow_stages = {
            "greeting", "service_selection", "date_selection",
            "name_input", "phone_input", "confirmation",
        }

        if conv["stage"] in flow_stages:
            # --- INTERCEPTOR ROBUSTO DE CAMBIO DE HORARIO / FECHA ---
            change_time_phrases = (
                "cambiar el horario", "cambiar horario", "cambiar la hora", "cambiar hora",
                "cambiar el dia", "cambiar el día", "cambiar dia", "cambiar día",
                "cambiar la fecha", "cambiar fecha", "cambiar turno", "modificar horario",
                "modificar la hora", "modificar hora", "modificar fecha", "modificar el dia",
                "modificar el día", "otro horario", "otra hora", "otro dia", "otro día",
                "otra fecha", "cambio de horario", "cambio de hora", "cambio de dia",
                "cambio de día", "cambio de fecha", "elegir otro horario", "elegir otra hora",
                "elegir otro dia", "elegir otra fecha"
            )
            explicit_change_schedule_phrases = (
                "cambiar el horario", "cambiar horario", "cambiar de horario",
                "cambiar el turno", "cambiar turno", "cambiar de turno",
                "cambiar la fecha", "cambiar fecha", "cambiar de fecha",
                "cambiar el dia", "cambiar dia", "cambiar de dia"
            )
            is_explicit_change_schedule = any(p in clean_msg for p in explicit_change_schedule_phrases)

            is_change_time_intent = (
                is_explicit_change_schedule
                or any(p in clean_msg for p in change_time_phrases)
                or (semantic_analysis.change_of_mind and semantic_analysis.change_type in ("date", "time", "date_time", "schedule"))
            )
            is_in_name_stage = conv["stage"] in ("name_input", "name_selection")
            if is_change_time_intent and (is_explicit_change_schedule or not (is_in_name_stage and _has_name_rejection_tokens(message))):
                service = conv.get("selected_service") or (conv.get("selected_services", [None])[0] if conv.get("selected_services") else None)
                if not service:
                    conv["stage"] = "service_selection"
                    catalog = format_services_catalog(services_catalog)
                    response = (
                        "¡Por supuesto! 💕 Para coordinar tu nuevo turno, contame primero qué servicio te gustaría realizarte:\n\n"
                        f"{catalog}"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

                conv["fallback_count"] = 0
                conv["low_confidence_count"] = 0
                conv["selected_date"] = None
                conv["selected_time"] = None
                conv["stage"] = "date_selection"
                price_str = _format_price(service.get("price", 0))

                # ¿El mensaje incluye explícitamente una nueva fecha y horario?
                parsed_dt = parse_date(semantic_analysis.date_time_text or message)
                if parsed_dt:
                    date_str, time_str = parsed_dt
                    availability = await get_availability(date_str, service["id"])
                    matching_slot = (
                        next((s for s in availability if s.get("time") == time_str and s.get("available")), None)
                        if availability is not None
                        else None
                    )
                    if availability is not None and not matching_slot:
                        available_times = [s["time"] for s in availability if s.get("available")][:5]
                        if available_times:
                            times_str = ", ".join([f"*{t}hs*" for t in available_times])
                            response = (
                                f"¡Entendido! 💕 El horario de las *{time_str}hs* para esa fecha ya está ocupado.\n\n"
                                f"Horarios disponibles: {times_str}\n\n"
                                f"¿Cuál te queda mejor o preferís otra opción? 😊"
                            )
                        else:
                            response = (
                                f"¡Entendido! 💕 No hay turnos disponibles para esa fecha.\n\n"
                                f"¿Querés que te anote en la *lista de espera* o probamos con otro día? ✨"
                            )
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return welcome_back_prefix + response

                    conv["selected_date"] = date_str
                    conv["selected_time"] = time_str
                    disp_date = _format_date_display(date_str)

                    if not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                        conv["stage"] = "name_input"
                        response = (
                            f"¡Perfecto! 📅 Cambiamos tu turno para el *{disp_date} a las {time_str}hs*.\n\n"
                            f"Para confirmar tu reserva, ¿me dirías tu *nombre completo*? 😊"
                        )
                    elif not conv.get("phone_confirmed"):
                        conv["stage"] = "phone_input"
                        response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
                    else:
                        conv["stage"] = "confirmation"
                        response = (
                            f"✨ *Resumen actualizado de tu turno:*\n\n"
                            f"💇 Servicio: *{service['name']}*\n"
                            f"💰 Precio: {price_str}\n"
                            f"📅 Fecha: *{disp_date} a las {time_str}hs*\n"
                            f"👤 Nombre: *{conv['customer_name']}*\n"
                            f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                            f"¿Confirmamos? Escribí *sí* para reservar 💕"
                        )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

                # Si no dio fecha/hora, ofrecer activamente los 3 mejores slots de Smart Gaps
                day_label, compact_slots = await _get_compact_smart_slots(service["id"], max_slots=3)
                if compact_slots:
                    times_formatted = ", ".join([f"*{s}hs*" for s in compact_slots[:-1]]) + f" o *{compact_slots[-1]}hs*" if len(compact_slots) > 1 else f"*{compact_slots[0]}hs*"
                    day_str = "hoy" if day_label == "hoy" else ("mañana" if day_label == "mañana" else f"el {day_label}")
                    response = (
                        f"¡Claro que sí! 💕 Cambiamos el horario de tu turno para *{service['name']}* ({price_str}).\n\n"
                        f"Para aprovechar los mejores horarios de agenda, las opciones más recomendadas para {day_str} son:\n"
                        f"✨ {times_formatted}\n\n"
                        f"¿Cuál te queda más cómodo o para qué día y horario preferís reservar? 😊"
                    )
                else:
                    response = (
                        f"¡Claro que sí! 💕 Cambiamos el horario de tu turno para *{service['name']}* ({price_str}).\n\n"
                        f"¿Para qué día y horario preferís agendar? "
                        f"(ejemplo: _\"mañana 14hs\"_ o _\"jueves 16:30\"_) ✨"
                    )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Lógica de Continuidad Analítica (Memoria de Largo Plazo + Smart Gaps)
            pending_continuity = conv.get("pending_continuity_service") or conv.get("selected_service")
            last_model_msg = ""
            for hist_item in reversed(chat_history[:-1]):
                if hist_item.get("role") == "model":
                    last_model_msg = " ".join(hist_item.get("parts", [])).lower()
                    break

            asked_continuity = bool(
                conv.get("awaiting_continuity")
                or "¿seguimos?" in last_model_msg
                or "habíamos quedado con tu turno" in last_model_msg
                or "continuamos?" in last_model_msg
                or "shall we continue?" in last_model_msg
                or (welcome_back_prefix and "¿seguimos?" in welcome_back_prefix.lower())
            )

            pending_idx = None
            if pending_continuity:
                for idx, s in enumerate(services_catalog, 1):
                    if s.get("id") == pending_continuity.get("id") or s.get("name", "").strip().lower() == pending_continuity.get("name", "").strip().lower():
                        pending_idx = idx
                        break

            opt_match = re.match(r"^(?:opci[oó]n\s*#?|#)?\s*([1-9]\d?)\.?$", clean_msg_strip, re.IGNORECASE)
            opt_num = int(opt_match.group(1)) if opt_match else None

            user_sent_pending_idx = (
                pending_idx is not None
                and (
                    (opt_num is not None and opt_num == pending_idx)
                    or clean_msg_strip == str(pending_idx)
                    or clean_msg in (
                        f"el {pending_idx}", f"la {pending_idx}", f"opcion {pending_idx}",
                        f"opción {pending_idx}", f"opcion #{pending_idx}", f"opción #{pending_idx}",
                        f"#{pending_idx}", f"numero {pending_idx}", f"número {pending_idx}"
                    )
                )
            )

            user_confirmed_continuity = clean_msg in (
                "si", "sí", "dale", "ok", "así es", "asi es", "continuar", "obvio", "claro",
                "de una", "vamos", "perfecto", "bueno", "acepto", "confirmar", "confirmo",
                "seguimos", "sii", "siii", "yes", "yep", "sep"
            ) or (intent == "CONFIRM_APPOINTMENT" and asked_continuity)

            user_sent_service_name = bool(
                pending_continuity
                and pending_continuity.get("name", "").strip().lower() in clean_msg
            )

            # Caso A: Rechazo explícito de la continuidad
            if asked_continuity and clean_msg in ("no", "nop", "cancelar", "cambiar", "no quiero", "otro", "otra cosa"):
                conv["awaiting_continuity"] = False
                conv["pending_continuity_service"] = None
                conv["selected_service"] = None
                conv["selected_services"] = []
                conv["stage"] = "service_selection"
                catalog = format_services_catalog(services_catalog)
                response = (
                    "¡No hay problema! 💕 Contame qué servicio te gustaría realizarte o elegí una de estas opciones:\n\n"
                    f"{catalog}"
                )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

            # Caso B: El usuario eligió otra opción numérica diferente a la pendiente
            if asked_continuity and opt_num is not None and opt_num != pending_idx:
                conv["awaiting_continuity"] = False
                conv["pending_continuity_service"] = None
                # No retorna; permite que continúe al selector general de servicios

            # Caso C: Continuidad aceptada (por número exacto de opción, afirmación o nombre de servicio)
            elif (
                (asked_continuity and (user_sent_pending_idx or user_confirmed_continuity or user_sent_service_name))
                or (pending_continuity and user_sent_pending_idx and conv.get("stage") in ("greeting", "service_selection", "date_selection"))
            ):
                conv["fallback_count"] = 0
                conv["low_confidence_count"] = 0
                conv["awaiting_continuity"] = False
                conv["pending_continuity_service"] = None

                # Mantener el servicio activo sin limpiar la sesión
                conv["selected_service"] = pending_continuity
                conv["selected_services"] = [pending_continuity]
                conv["cross_sell_offered"] = None
                conv["cancelling_apt"] = None
                conv["rescheduling_apt"] = None
                conv["upcoming_apts"] = []

                welcome_back_prefix = ""
                price_str = _format_price(pending_continuity["price"])

                # ¿El usuario especificó fecha/hora en este mensaje?
                parsed_dt = parse_date(semantic_analysis.date_time_text or message)
                if parsed_dt:
                    date_str, time_str = parsed_dt
                    availability = await get_availability(date_str, pending_continuity["id"])
                    matching_slot = (
                        next((s for s in availability if s.get("time") == time_str and s.get("available")), None)
                        if availability is not None
                        else None
                    )

                    if availability is not None and not matching_slot:
                        available_times = [s["time"] for s in availability if s.get("available")][:5]
                        if available_times:
                            times_str = ", ".join([f"*{t}hs*" for t in available_times])
                            response = (
                                f"¡Genial! 💕 Continuamos con *{pending_continuity['name']}* ({price_str}).\n\n"
                                f"😔 El horario de las *{time_str}hs* para esa fecha ya está ocupado.\n\n"
                                f"Horarios disponibles: {times_str}\n\n"
                                f"¿Cuál te queda mejor o preferís otro día y horario? 😊"
                            )
                        else:
                            response = (
                                f"¡Genial! 💕 Continuamos con *{pending_continuity['name']}* ({price_str}).\n\n"
                                f"😔 No hay turnos disponibles para ese día.\n\n"
                                f"¿Querés que te anote en la *lista de espera* o probamos con otra fecha? ✨"
                            )
                        conv["stage"] = "date_selection"
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return response

                    conv["selected_date"], conv["selected_time"] = parsed_dt
                    disp_date = _format_date_display(parsed_dt[0])

                    if not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                        conv["stage"] = "name_input"
                        response = (
                            f"¡Genial! 💕 Continuamos con *{pending_continuity['name']}* ({price_str}).\n\n"
                            f"Te agendamos para el *{disp_date} a las {parsed_dt[1]}hs*.\n\n"
                            f"Para confirmar tu turno, ¿me dirías tu *nombre completo*? 😊"
                        )
                    elif not conv.get("phone_confirmed"):
                        conv["stage"] = "phone_input"
                        response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
                    else:
                        conv["stage"] = "confirmation"
                        response = (
                            f"✨ *Resumen de tu turno:*\n\n"
                            f"💇 Servicio: *{pending_continuity['name']}*\n"
                            f"💰 Precio: {price_str}\n"
                            f"📅 Fecha: *{disp_date} a las {parsed_dt[1]}hs*\n"
                            f"👤 Nombre: *{conv['customer_name']}*\n"
                            f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                            f"¿Confirmamos? Escribí *sí* para reservar 💕"
                        )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response

                # Transición inmediata a date_selection ofreciendo los 3 horarios más compactos del optimizador Smart Gaps
                conv["stage"] = "date_selection"
                conv["selected_date"] = None
                conv["selected_time"] = None

                day_label, compact_slots = await _get_compact_smart_slots(pending_continuity["id"], max_slots=3)

                if compact_slots:
                    times_formatted = ", ".join([f"*{s}hs*" for s in compact_slots[:-1]]) + f" o *{compact_slots[-1]}hs*" if len(compact_slots) > 1 else f"*{compact_slots[0]}hs*"
                    day_str = "hoy" if day_label == "hoy" else ("mañana" if day_label == "mañana" else f"el {day_label}")
                    response = (
                        f"¡Genial! 💕 Continuamos con tu turno de *{pending_continuity['name']}* ({price_str}).\n\n"
                        f"Para aprovechar los mejores horarios de agenda, las opciones más recomendadas para {day_str} son:\n"
                        f"✨ {times_formatted}\n\n"
                        f"¿Cuál te queda más cómodo o preferís otro día y horario? 😊"
                    )
                else:
                    response = (
                        f"¡Genial! 💕 Continuamos con tu turno de *{pending_continuity['name']}* ({price_str}).\n\n"
                        f"¿Para qué día y horario te gustaría reservar? "
                        f"(ejemplo: _\"hoy 16:30\"_, _\"mañana 14hs\"_ o _\"el viernes a las 11\"_) ✨"
                    )

                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)

                gallery = get_gallery_image_for_category(pending_continuity.get("category", ""))
                if gallery and gallery.get("url"):
                    return {"response": response, "image_url": gallery["url"]}
                return response

            is_cross_sell_acceptance = (
                conv.get("stage") == "date_selection"
                and conv.get("cross_sell_offered")
                and any(w in clean_msg for w in (
                    "sumalo", "sumar", "agregalo", "agregar", "dale", "si, sumalo", "sí, sumalo", "me gusta",
                    "bano de luz", "baño de luz", "nutricion", "nutrición"
                ))
            )

            if (
                intent == "CONFIRM_APPOINTMENT"
                and not is_cross_sell_acceptance
                and not asked_continuity
                and conv.get("stage") not in ("confirmation", "service_selection")
            ):
                conv["fallback_count"] = 0
                confirmed_apt = await confirm_upcoming_appointment(
                    phone=clean_phone, instagram=sender_id
                )
                if confirmed_apt:
                    service_name = confirmed_apt.get("service", {}).get("name", "tu servicio")
                    date_display = format_appointment_datetime(confirmed_apt.get("date"))
                    response = (
                        f"🎉 ¡Muchas gracias! 💕 Tu turno para *{service_name}* "
                        f"el *{date_display}* ha quedado *confirmado*.\n\n"
                        f"Te esperamos en *Av. Corrientes 1234, CABA* ✨"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    conversations.pop(sender_id, None)
                    delete_conversation_state(sender_id)
                    return welcome_back_prefix + response
                else:
                    response = "No encontré un turno pendiente que confirmar. Si querés reservar uno nuevo, escribí *reservar* 😊"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

            elif intent == "CANCEL_APPOINTMENT":
                conv["fallback_count"] = 0
                upcoming = await get_upcoming_appointments(phone=clean_phone, instagram=sender_id)
                if not upcoming:
                    response = "No encontré ningún turno activo agendado. ¿Querés reservar uno? Escribí *reservar* 😊"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response
                elif len(upcoming) == 1:
                    apt = upcoming[0]
                    conv["cancelling_apt"] = apt
                    conv["stage"] = "confirm_cancellation"
                    service_name = apt.get("service", {}).get("name", "Servicio")
                    date_display = format_appointment_datetime(apt.get("date"))

                    policy_notice = ""
                    try:
                        raw_date = apt.get("date")
                        if raw_date:
                            if isinstance(raw_date, str):
                                apt_dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(TZ_AR)
                            elif isinstance(raw_date, datetime):
                                apt_dt = raw_date if raw_date.tzinfo else TZ_AR.localize(raw_date)
                            diff_hours = (apt_dt - datetime.now(TZ_AR)).total_seconds() / 3600.0
                            if 0 <= diff_hours < 2:
                                policy_notice = (
                                    "\n\n⚠️ *Aviso de Política:* Faltan menos de 2 horas para tu turno. "
                                    "Te recordamos con cariño que solicitamos avisar con al menos 2 horas de anticipación "
                                    "para dar lugar a la lista de espera."
                                )
                    except Exception as date_err:
                        logger.warning(f"Error calculating cancellation window: {date_err}")

                    response = (
                        f"📅 Tenés un turno agendado:\n"
                        f"💇 *{service_name}*\n"
                        f"⏰ *{date_display}*{policy_notice}\n\n"
                        f"¿Confirmás que querés cancelarlo? "
                        f"Escribí *sí* para cancelar o *no* para mantenerlo 💕"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response
                else:
                    conv["upcoming_apts"] = upcoming
                    conv["stage"] = "select_apt_to_cancel"
                    lines = ["📅 Tenés varios turnos próximos. ¿Cuál querés cancelar?\n"]
                    for i, apt in enumerate(upcoming, 1):
                        s_name = apt.get("service", {}).get("name", "Servicio")
                        d_str = format_appointment_datetime(apt.get("date"))
                        lines.append(f"{i}. 💇 *{s_name}* — {d_str}")
                    lines.append("\nEscribí el número del turno que querés cancelar 😊")
                    response = "\n".join(lines)
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

            elif intent == "RESCHEDULE_APPOINTMENT":
                conv["fallback_count"] = 0
                upcoming = await get_upcoming_appointments(phone=clean_phone, instagram=sender_id)
                if not upcoming:
                    response = "No encontré ningún turno activo para reprogramar. ¿Querés reservar uno nuevo? Escribí *reservar* 😊"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response
                elif len(upcoming) == 1:
                    apt = upcoming[0]
                    conv["rescheduling_apt"] = apt
                    conv["stage"] = "reschedule_date_selection"
                    service_name = apt.get("service", {}).get("name", "Servicio")
                    date_display = format_appointment_datetime(apt.get("date"))
                    response = (
                        f"📅 Tu turno actual:\n"
                        f"💇 *{service_name}*\n"
                        f"⏰ *{date_display}*\n\n"
                        f"¿Para qué nuevo día y horario te gustaría pasarlo? "
                        f"(ejemplo: _\"jueves 15hs\"_ o _\"mañana a las 11\"_) 😊"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response
                else:
                    conv["upcoming_apts"] = upcoming
                    conv["stage"] = "select_apt_to_reschedule"
                    lines = ["📅 Tenés varios turnos próximos. ¿Cuál querés reprogramar?\n"]
                    for i, apt in enumerate(upcoming, 1):
                        s_name = apt.get("service", {}).get("name", "Servicio")
                        d_str = format_appointment_datetime(apt.get("date"))
                        lines.append(f"{i}. 💇 *{s_name}* — {d_str}")
                    lines.append("\nEscribí el número del turno que querés reprogramar 😊")
                    response = "\n".join(lines)
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

            faq_map = {
                "FAQ_UBICACION": "ubicacion",
                "FAQ_HORARIO": "horario",
                "FAQ_SERVICIOS": "servicios",
                "FAQ_PAGOS": "metodos_pago",
                "FAQ_CANCELACION": "cancelacion",
            }
            topic_to_faq = {
                "pagos": "metodos_pago",
                "precios": "servicios",
                "ubicacion": "ubicacion",
                "horario": "horario",
                "cancelacion": "cancelacion",
                "servicios": "servicios",
            }
            faq_key = faq_map.get(intent) or (topic_to_faq.get(semantic_analysis.digression_topic) if semantic_analysis.has_digression else None)
            if faq_key:
                conv["fallback_count"] = 0
                faq_response = get_faq_response(faq_key)
                if faq_response:
                    if conv["stage"] in ("service_selection", "date_selection", "name_input", "name_selection", "phone_input", "confirmation"):
                        # Contextual return bridge without resetting or leaving active booking stage
                        return_bridge = build_contextual_return_prompt(conv["stage"], conv, lang)
                        response = f"{faq_response}{return_bridge}"
                    else:
                        response = faq_response + "\n\n¿Querés reservar un turno? Escribí *turno* o *reservar* 😊"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response
        # STEP 3.4: Global Catalog Option / Service Selection Interceptor
        # If the user selects a catalog service (by option 1-6 or direct service name),
        # force a clean reset of any old/orphaned reservation state and transition cleanly to date_selection.
        clean_msg_strip = message.strip()
        is_cancelling_apt_pick = (
            conv.get("stage") in ("select_apt_to_cancel", "select_apt_to_reschedule")
            and clean_msg_strip.isdigit()
            and 1 <= int(clean_msg_strip) <= len(conv.get("upcoming_apts", []))
        )

        catalog_selected_service = None
        digits_only = "".join(filter(str.isdigit, clean_msg_strip))
        is_phone_number = len(digits_only) >= 7

        if not is_cancelling_apt_pick and not is_phone_number and clean_msg not in (
            "hola", "buenas", "buen día", "buen dia", "buenas tardes", "buenas noches",
            "inicio", "reset", "menu", "menú", "empieza", "empezar de nuevo",
            "si", "sí", "no", "nop", "cancelar"
        ):
            opt_match = re.match(r"^(?:opci[oó]n\s*#?|#)?\s*([1-9]\d?)\.?$", clean_msg_strip, re.IGNORECASE)
            opt_with_text = re.match(r"^(?:opci[oó]n\s*#?|#)\s*([1-9]\d?)\s+(.+)$", clean_msg_strip, re.IGNORECASE)

            if opt_match:
                opt_idx = int(opt_match.group(1))
                catalog_selected_service = get_service_by_index(opt_idx)
            elif opt_with_text:
                opt_idx = int(opt_with_text.group(1))
                catalog_selected_service = get_service_by_index(opt_idx)

            if not catalog_selected_service:
                # Check exact service name match
                for s in get_services():
                    s_low = s["name"].lower()
                    if clean_msg == s_low or clean_msg == s_low.replace("tratamiento ", ""):
                        catalog_selected_service = s
                        break

            # If not conversational change of mind, also check short service names
            if not catalog_selected_service and not semantic_analysis.change_of_mind and len(clean_msg_strip.split()) <= 4:
                direct_s = get_service_by_name(clean_msg_strip)
                if direct_s and (direct_s["name"].lower() in clean_msg or clean_msg in direct_s["name"].lower()):
                    catalog_selected_service = direct_s

        if catalog_selected_service:
            conv["fallback_count"] = 0
            conv["low_confidence_count"] = 0
            conv["selected_service"] = catalog_selected_service
            conv["selected_services"] = [catalog_selected_service]

            # Force clean reset of stale/orphaned booking slots
            conv["selected_date"] = None
            conv["selected_time"] = None
            conv["cross_sell_offered"] = None
            conv["cancelling_apt"] = None
            conv["rescheduling_apt"] = None
            conv["upcoming_apts"] = []
            conv["phone_confirmed"] = False

            price_str = _format_price(catalog_selected_service["price"])

            # Did the user also provide date/time in the same message?
            parsed_dt = parse_date(semantic_analysis.date_time_text or message)
            if parsed_dt:
                date_str, time_str = parsed_dt
                availability = await get_availability(date_str, catalog_selected_service["id"])
                matching_slot = (
                    next((s for s in availability if s.get("time") == time_str and s.get("available")), None)
                    if availability is not None
                    else None
                )

                if availability is not None and not matching_slot:
                    available_times = [s["time"] for s in availability if s.get("available")][:5]
                    if available_times:
                        times_str = ", ".join([f"*{t}hs*" for t in available_times])
                        response = (
                            f"¡Excelente elección! 💇 *{catalog_selected_service['name']}* ({price_str}).\n\n"
                            f"😔 El horario de las *{time_str}hs* para esa fecha ya está ocupado.\n\n"
                            f"Horarios disponibles: {times_str}\n\n"
                            f"¿Cuál te queda mejor? 😊"
                        )
                    else:
                        response = (
                            f"¡Excelente elección! 💇 *{catalog_selected_service['name']}* ({price_str}).\n\n"
                            f"😔 No hay turnos disponibles para ese día.\n\n"
                            f"¿Querés que te anote en la *lista de espera* o probamos con otra fecha? ✨"
                        )
                    conv["stage"] = "date_selection"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

                conv["selected_date"], conv["selected_time"] = parsed_dt
                disp_date = _format_date_display(parsed_dt[0])

                if not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                    conv["stage"] = "name_input"
                    response = (
                        f"¡Excelente elección! 💇 *{catalog_selected_service['name']}* ({price_str}).\n\n"
                        f"Te agendamos para el *{disp_date} a las {parsed_dt[1]}hs*.\n\n"
                        f"Para confirmar tu turno, ¿me dirías tu *nombre completo*? 😊"
                    )
                elif not conv.get("phone_confirmed"):
                    conv["stage"] = "phone_input"
                    response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
                else:
                    conv["stage"] = "confirmation"
                    response = (
                        f"✨ *Resumen de tu turno:*\n\n"
                        f"💇 Servicio: *{catalog_selected_service['name']}*\n"
                        f"💰 Precio: {price_str}\n"
                        f"📅 Fecha: *{disp_date} a las {parsed_dt[1]}hs*\n"
                        f"👤 Nombre: *{conv['customer_name']}*\n"
                        f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                        f"¿Confirmamos? Escribí *sí* para reservar 💕"
                    )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # No date provided: advance session directly to date_selection
            conv["stage"] = "date_selection"

            # Check subtle cross-sell opportunity based on long-term memory
            cross_sell_text = ""
            clean_phone = normalize_phone(conv.get("customer_phone") or sender_id)
            cross_sell = detect_cross_sell_opportunity(clean_phone, catalog_selected_service)
            if cross_sell:
                cross_sell_text = f"\n\n{cross_sell['message_hint']}"
                conv["cross_sell_offered"] = cross_sell["suggested_treatment"]

            day_label, compact_slots = await _get_compact_smart_slots(catalog_selected_service["id"], max_slots=3)
            if compact_slots:
                times_formatted = ", ".join([f"*{s}hs*" for s in compact_slots[:-1]]) + f" o *{compact_slots[-1]}hs*" if len(compact_slots) > 1 else f"*{compact_slots[0]}hs*"
                day_str = "hoy" if day_label == "hoy" else ("mañana" if day_label == "mañana" else f"el {day_label}")
                response = (
                    f"¡Excelente elección! 💇 *{catalog_selected_service['name']}* "
                    f"({price_str}, {catalog_selected_service['duration']}min).{cross_sell_text}\n\n"
                    f"Para aprovechar los mejores horarios de agenda, las opciones más recomendadas para {day_str} son:\n"
                    f"✨ {times_formatted}\n\n"
                    f"¿Cuál te queda más cómodo o para qué día y horario preferís reservar? ✨"
                )
            else:
                response = (
                    f"¡Excelente elección! 💇 *{catalog_selected_service['name']}* "
                    f"({price_str}, {catalog_selected_service['duration']}min).{cross_sell_text}\n\n"
                    f"¿Para qué día y horario te gustaría reservar? "
                    f"(ejemplo: _\"mañana 14hs\"_, _\"jueves 16:30\"_ o _\"el 15 a las 11\"_) ✨"
                )
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)

            gallery = get_gallery_image_for_category(catalog_selected_service.get("category", ""))
            if gallery and gallery.get("url"):
                return {"response": welcome_back_prefix + response, "image_url": gallery["url"]}
            return welcome_back_prefix + response

        # STEP 3.5: Handle Mid-Process Change of Mind (Arrepentimiento)
        is_in_name_stage = conv["stage"] in ("name_input", "name_selection")
        should_handle_change_of_mind = (
            conv["stage"] in ("date_selection", "phone_input", "confirmation")
            or (is_in_name_stage and not _has_name_rejection_tokens(message))
        )
        if should_handle_change_of_mind and semantic_analysis.change_of_mind:
            conv["fallback_count"] = 0

            # 1. Did the customer change service?
            if semantic_analysis.services:
                for s_cand in semantic_analysis.services:
                    matched = get_service_by_name(s_cand)
                    if matched:
                        conv["selected_service"] = matched
                        conv["selected_services"] = [matched]
                        if not semantic_analysis.date_time_text:
                            conv["selected_date"] = None
                            conv["selected_time"] = None
                        break

            # 2. Did the customer provide/change date/time?
            parsed_new_date = parse_date(semantic_analysis.date_time_text or message)
            if parsed_new_date:
                conv["selected_date"], conv["selected_time"] = parsed_new_date

            curr_service = conv.get("selected_service")
            s_name = curr_service.get("name", "tu servicio") if curr_service else "tu servicio"
            s_price = _format_price(curr_service.get("price", 0)) if curr_service else ""

            # Guide customer to next pending slot
            if not conv.get("selected_date") or not conv.get("selected_time"):
                conv["stage"] = "date_selection"
                response = f"¡Dale, perfecto! 💕 Cambiamos a *{s_name}* ({s_price}).\n\n¿Para qué día y horario te gustaría agendar? ✨"
            elif not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                conv["stage"] = "name_input"
                disp_d = _format_date_display(conv["selected_date"])
                response = f"¡Dale, perfecto! 💕 Cambiamos a *{s_name}* para el *{disp_d} a las {conv['selected_time']}hs*.\n\nPara confirmar tu turno, ¿me dirías tu *nombre completo*? 😊"
            elif not conv.get("phone_confirmed"):
                conv["stage"] = "phone_input"
                response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
            else:
                conv["stage"] = "confirmation"
                disp_d = _format_date_display(conv["selected_date"])
                response = (
                    f"✨ *Resumen de tu turno actualizado:*\n\n"
                    f"💇 Servicio: *{s_name}*\n"
                    f"💰 Precio: {s_price}\n"
                    f"📅 Fecha: *{disp_d} a las {conv['selected_time']}hs*\n"
                    f"👤 Nombre: *{conv['customer_name']}*\n"
                    f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                    f"¿Confirmamos el cambio? Escribí *sí* para reservar 💕"
                )

            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # STEP 4: Stage Handling
        stage = conv["stage"]

        clean_msg = message.strip().lower()
        if clean_msg in ("hola", "buenas", "buen día", "buen dia", "buenas tardes",
                         "buenas noches", "inicio", "reset", "menu", "menú",
                         "empieza", "empezar de nuevo"):
            conv["stage"] = "greeting"
            stage = "greeting"
            conv["phone_confirmed"] = False
            stage = "greeting"
        # ---- GREETING ----
        if stage == "greeting":
            conv["fallback_count"] = 0
            services = get_services()
            catalog = format_services_catalog(services)

            # Dynamic Slot Filling in Greeting (e.g. "Hola soy Romina, quiero un corte mañana 15hs")
            greet_service = None
            if semantic_analysis.services:
                for s_cand in semantic_analysis.services:
                    greet_service = get_service_by_name(s_cand)
                    if greet_service:
                        break
            if not greet_service and len(message.split()) > 1:
                greet_service = get_service_by_name(message)

            parsed_greet_date = parse_date(semantic_analysis.date_time_text or message)

            if greet_service and parsed_greet_date:
                conv["selected_service"] = greet_service
                conv["selected_services"] = [greet_service]
                date_str, time_str = parsed_greet_date
                price_str = _format_price(greet_service["price"])

                availability = await get_availability(date_str, greet_service["id"])
                matching_slot = (
                    next((s for s in availability if s.get("time") == time_str and s.get("available")), None)
                    if availability is not None
                    else None
                )
                if availability is not None and not matching_slot:
                    available_times = [s["time"] for s in availability if s.get("available")][:5]
                    if available_times:
                        times_str = ", ".join([f"*{t}hs*" for t in available_times])
                        response = (
                            f"¡Hola, hermosa! 💕 *{greet_service['name']}* ({price_str}).\n\n"
                            f"😔 El horario de las *{time_str}hs* para esa fecha ya está ocupado.\n\n"
                            f"Horarios disponibles: {times_str}\n\n"
                            f"¿Cuál te queda mejor? 😊"
                        )
                    else:
                        response = (
                            f"¡Hola, hermosa! 💕 *{greet_service['name']}* ({price_str}).\n\n"
                            f"😔 No hay turnos disponibles para ese día.\n\n"
                            f"¿Querés que te anote en la *lista de espera* o probamos con otra fecha? ✨"
                        )
                    conv["stage"] = "date_selection"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

                conv["selected_date"], conv["selected_time"] = parsed_greet_date
                disp_date = _format_date_display(parsed_greet_date[0])

                if not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                    conv["stage"] = "name_input"
                    response = (
                        f"¡Hola, hermosa! 💕 ¡Qué lindo que nos escribas! Agendamos *{greet_service['name']}* ({price_str}) "
                        f"para el *{disp_date} a las {parsed_greet_date[1]}hs*.\n\n"
                        f"Para confirmar tu turno, ¿me dirías tu *nombre completo*? 😊"
                    )
                elif not conv.get("phone_confirmed"):
                    conv["stage"] = "phone_input"
                    response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
                else:
                    conv["stage"] = "confirmation"
                    response = (
                        f"✨ *Resumen de tu turno:*\n\n"
                        f"💇 Servicio: *{greet_service['name']}*\n"
                        f"💰 Precio: {price_str}\n"
                        f"📅 Fecha: *{disp_date} a las {parsed_greet_date[1]}hs*\n"
                        f"👤 Nombre: *{conv['customer_name']}*\n"
                        f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                        f"¿Confirmamos? Escribí *sí* para reservar 💕"
                    )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            elif greet_service:
                conv["selected_service"] = greet_service
                conv["selected_services"] = [greet_service]
                conv["stage"] = "date_selection"
                price_str = _format_price(greet_service["price"])
                response = (
                    f"¡Excelente elección! 💇 *{greet_service['name']}* "
                    f"({price_str}, {greet_service['duration']}min).\n\n"
                    f"¿Para qué día y hora te gustaría reservar? "
                    f"(ejemplo: _\"mañana 14hs\"_ o _\"jueves 16:30\"_) ✨"
                )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            elif parsed_greet_date and not greet_service:
                conv["selected_date"], conv["selected_time"] = parsed_greet_date
                disp_date = _format_date_display(parsed_greet_date[0])
                response = (
                    f"¡Hola, hermosa! 💕 ¡Qué lindo que nos escribas! Con gusto te agendamos para el *{disp_date} a las {parsed_greet_date[1]}hs*.\n\n"
                    f"¿Qué servicio te gustaría realizarte? ✨\n\n"
                    f"{catalog}"
                )
                conv["stage"] = "service_selection"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response


            if intent == "BOOKING" and len(message.split()) > 3:
                multi = await _parse_multi_service(message, services, chat_history)
                matched_services = []
                for sname in multi.get("servicios", []):
                    s = get_service_by_name(sname)
                    if s:
                        matched_services.append(s)

                if len(matched_services) >= 2:
                    conv["selected_services"] = matched_services
                    conv["selected_service"] = matched_services[0]
                    total_price = sum(s["price"] for s in matched_services)
                    total_duration = sum(s["duration"] for s in matched_services)
                    details = "\n".join([
                        f"  💇 *{s['name']}* — {_format_price(s['price'])} ({s['duration']}min)"
                        for s in matched_services
                    ])
                    response = t("multi_service_summary", lang,
                        count=len(matched_services),
                        details=details,
                        price=_format_price(total_price),
                        duration=f"{total_duration}min",
                    )
                    conv["stage"] = "date_selection"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

            # Standard greeting
            response = t("greeting", lang, catalog=catalog)
            conv["stage"] = "service_selection"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # ---- SERVICE_SELECTION ----
        elif stage == "service_selection":
            matched_service = None
            clean_digits = "".join(c for c in message.strip() if c.isdigit())
            if clean_digits:
                try:
                    matched_service = get_service_by_index(int(clean_digits))
                except (ValueError, IndexError):
                    matched_service = None
            if not matched_service and semantic_analysis.services:
                for s_cand in semantic_analysis.services:
                    matched_service = get_service_by_name(s_cand)
                    if matched_service:
                        break
            if not matched_service:
                matched_service = get_service_by_name(message)

            if matched_service:
                conv["fallback_count"] = 0
                conv["selected_service"] = matched_service
                conv["selected_services"] = [matched_service]
                price_str = _format_price(matched_service["price"])

                # Check if date was also provided in the same turn or preserved from greeting
                parsed_dt = parse_date(semantic_analysis.date_time_text or message)
                if not parsed_dt and conv.get("selected_date") and conv.get("selected_time"):
                    parsed_dt = (conv["selected_date"], conv["selected_time"])

                if parsed_dt:
                    date_str, time_str = parsed_dt
                    availability = await get_availability(date_str, matched_service["id"])
                    matching_slot = (
                        next((s for s in availability if s.get("time") == time_str and s.get("available")), None)
                        if availability is not None
                        else None
                    )

                    if availability is not None and not matching_slot:
                        available_times = [s["time"] for s in availability if s.get("available")][:5]
                        if available_times:
                            times_str = ", ".join([f"*{t}hs*" for t in available_times])
                            response = (
                                f"¡Excelente elección! 💇 *{matched_service['name']}* ({price_str}).\n\n"
                                f"😔 El horario de las *{time_str}hs* para esa fecha ya está ocupado.\n\n"
                                f"Horarios disponibles: {times_str}\n\n"
                                f"¿Cuál te queda mejor? 😊"
                            )
                        else:
                            response = (
                                f"¡Excelente elección! 💇 *{matched_service['name']}* ({price_str}).\n\n"
                                f"😔 No hay turnos disponibles para ese día.\n\n"
                                f"¿Querés que te anote en la *lista de espera* o probamos con otra fecha? ✨"
                            )
                        conv["stage"] = "date_selection"
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return welcome_back_prefix + response

                    conv["selected_date"], conv["selected_time"] = parsed_dt
                    disp_date = _format_date_display(parsed_dt[0])

                    if not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                        conv["stage"] = "name_input"
                        response = (
                            f"¡Excelente elección! 💇 *{matched_service['name']}* ({price_str}).\n\n"
                            f"Te agendamos para el *{disp_date} a las {parsed_dt[1]}hs*.\n\n"
                            f"Para confirmar tu turno, ¿me dirías tu *nombre completo*? 😊"
                        )
                    elif not conv.get("phone_confirmed"):
                        conv["stage"] = "phone_input"
                        response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
                    else:
                        conv["stage"] = "confirmation"
                        response = (
                            f"✨ *Resumen de tu turno:*\n\n"
                            f"💇 Servicio: *{matched_service['name']}*\n"
                            f"💰 Precio: {price_str}\n"
                            f"📅 Fecha: *{disp_date} a las {parsed_dt[1]}hs*\n"
                            f"👤 Nombre: *{conv['customer_name']}*\n"
                            f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                            f"¿Confirmamos? Escribí *sí* para reservar 💕"
                        )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response


                conv["stage"] = "date_selection"

                # Check for subtle cross-sell opportunity based on long-term memory
                cross_sell_text = ""
                clean_phone = normalize_phone(conv.get("customer_phone") or sender_id)
                cross_sell = detect_cross_sell_opportunity(clean_phone, matched_service)
                if cross_sell:
                    cross_sell_text = f"\n\n{cross_sell['message_hint']}"
                    conv["cross_sell_offered"] = cross_sell["suggested_treatment"]

                day_label, compact_slots = await _get_compact_smart_slots(matched_service["id"], max_slots=3)
                if compact_slots:
                    times_formatted = ", ".join([f"*{s}hs*" for s in compact_slots[:-1]]) + f" o *{compact_slots[-1]}hs*" if len(compact_slots) > 1 else f"*{compact_slots[0]}hs*"
                    day_str = "hoy" if day_label == "hoy" else ("mañana" if day_label == "mañana" else f"el {day_label}")
                    response = (
                        f"¡Excelente elección! 💇 *{matched_service['name']}* "
                        f"({price_str}, {matched_service['duration']}min).{cross_sell_text}\n\n"
                        f"Para aprovechar los mejores horarios de agenda, las opciones más recomendadas para {day_str} son:\n"
                        f"✨ {times_formatted}\n\n"
                        f"¿Cuál te queda más cómodo o para qué día y horario preferís reservar? ✨"
                    )
                else:
                    response = (
                        f"¡Excelente elección! 💇 *{matched_service['name']}* "
                        f"({price_str}, {matched_service['duration']}min).{cross_sell_text}\n\n"
                        f"¿Para qué día y hora te gustaría reservar? "
                        f"(ejemplo: _\"mañana 14hs\"_, _\"jueves 16:30\"_ o _\"el 15 a las 11\"_) ✨"
                    )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)

                gallery = get_gallery_image_for_category(matched_service.get("category", ""))
                if gallery and gallery.get("url"):
                    return {"response": welcome_back_prefix + response, "image_url": gallery["url"]}
                return welcome_back_prefix + response

            # Check for objection on price, catalog or doubts
            is_service_objection = any(w in clean_msg for w in (
                "muy caro", "carisimo", "carísimo", "mas barato", "más barato", "no me convence",
                "no me gusta", "tienen otra cosa", "otro servicio", "no veo", "descuento", "promo"
            ))
            if is_service_objection:
                services = get_services()
                formatted_catalog = format_services_catalog(services)
                objection_prompt = OBJECTION_HANDLING_PROMPT.replace("{message}", message).replace(
                    "{context}", f"Catálogo disponible:\n{formatted_catalog}"
                )
                ai_response = await llm_pool.get_completion_async(
                    messages=chat_history[-8:],
                    system_msg=system_personality + "\n" + objection_prompt,
                    model="llama-3.1-8b-instant",
                    max_tokens=150,
                )
                if not ai_response:
                    ai_response = (
                        "Entiendo tu consulta 💕 Tenemos opciones adaptadas a cada gusto y necesidad. "
                        "¿Qué estilo o resultado estás buscando para recomendarte la mejor alternativa? ✨"
                    )
                response = _apply_output_guardrails(ai_response)
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Increment fallback count
            conv["fallback_count"] = conv.get("fallback_count", 0) + 1
            if conv["fallback_count"] >= 3:
                conv["stage"] = "human_escalated"
                sender_name = conv.get("customer_name") or f"Cliente ({sender_id[-4:] if len(sender_id)>=4 else sender_id})"
                summary = build_escalation_summary(conv, message)
                await escalate_to_human(sender_id, sender_name, summary, message)
                response = "Noto que estás buscando algo específico. Ya le avisé a Sofía para que te asesore directamente por WhatsApp 💕"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Service help via LLM async
            services = get_services()
            formatted_catalog = format_services_catalog(services)
            service_help_prompt = SERVICE_HELP_PROMPT.replace("{services_catalog}", formatted_catalog).replace("{message}", message)
            ai_response = await llm_pool.get_completion_async(
                messages=chat_history[-8:],
                system_msg=system_personality + "\n" + service_help_prompt,
                max_tokens=150,
            )
            response = ai_response if ai_response else "No te entendí bien, ¿me repetís qué servicio buscás? Podés elegir el número de la lista 💕"
            response = _apply_output_guardrails(response)
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # ---- DATE_SELECTION ----
        elif stage == "date_selection":
            # Si se perdió el servicio seleccionado, regresar a service_selection
            if not conv.get("selected_service"):
                conv["stage"] = "service_selection"
                services = get_services()
                catalog = format_services_catalog(services)
                response = "Primero elijamos el servicio que te gustaría realizarte 💕\n\n" + catalog
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Check if user requests waitlist
            if any(w in clean_msg for w in ("lista de espera", "anotame", "avísame", "avisame", "espera")):
                service = conv.get("selected_service")
                pref_date = conv.get("selected_date") or datetime.now(TZ_AR).strftime("%Y-%m-%d")
                s_id = service["id"] if service else ""
                cust_name = conv.get("customer_name") or f"Cliente ({sender_id[-4:]})"
                await add_to_waitlist_via_api(
                    customer_name=cust_name,
                    customer_phone=clean_phone,
                    service_id=s_id,
                    preferred_date=pref_date,
                )
                response = "✅ ¡Listo! Te anoté en la *lista de espera*. En cuanto se libere un turno te escribimos inmediatamente por WhatsApp 💕"
                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return welcome_back_prefix + response

            # Check if user accepts cross-sell offer
            if conv.get("cross_sell_offered") and any(w in clean_msg for w in (
                "sumalo", "sumar", "agregalo", "agregar", "dale", "si, sumalo", "sí, sumalo", "me gusta",
                "bano de luz", "baño de luz", "nutricion", "nutrición"
            )):
                services = get_services()
                treatment = next((s for s in services if any(k in s["name"].lower() for k in ("luz", "nutrici", "brillo"))), None)
                if treatment and treatment not in conv.get("selected_services", []):
                    conv["selected_services"].append(treatment)
                    conv["cross_sell_offered"] = None
                    response = (
                        f"¡Qué linda elección! 💕 Sumamos *{treatment['name']}* ({_format_price(treatment['price'])}) a tu turno.\n\n"
                        f"¿Para qué día y horario te gustaría agendar? "
                        f"(ejemplo: _\"mañana 14hs\"_ o _\"jueves 16:30\"_) ✨"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return welcome_back_prefix + response

            # Aviso explícito si menciona domingo o si pide turno para un domingo (ej. "mañana" en sábado)
            today_dt = datetime.now(TZ_AR).date()
            is_explicit_sunday = "domingo" in clean_msg
            is_tomorrow_sunday = (today_dt.weekday() == 5) and bool(re.search(r"(?<!de la\s)(?<!por la\s)\bma.?ana\b", clean_msg))
            if is_explicit_sunday or is_tomorrow_sunday:
                response = (
                    "Recordá que los domingos el salón permanece cerrado 💕\n\n"
                    "Abrimos de *Lunes a Sábado de 9:00 a 19:00hs* ✨\n\n"
                    "¿Te gustaría agendar para este *lunes* o preferís algún otro día?"
                )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            parsed = parse_date(message)

            if parsed:
                date_str, time_str = parsed
                service = conv.get("selected_service")

                if service:
                    availability = await get_availability(date_str, service["id"])
                    
                    if availability is None:
                        response = "Tuvimos un inconveniente momentáneo al consultar los horarios. Por favor, probá de nuevo en unos instantes 🙏"
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return welcome_back_prefix + response

                    matching_slot = next(
                        (s for s in availability if s.get("time") == time_str and s.get("available")),
                        None,
                    )
                    if availability is not None and not matching_slot:
                        available_times = [s["time"] for s in availability if s.get("available")][:5]
                        if available_times:
                            times_str = ", ".join([f"*{t}hs*" for t in available_times])
                            response = (
                                f"😔 Ese horario ya está ocupado.\n\n"
                                f"Horarios disponibles para esa fecha: {times_str}\n\n"
                                f"¿Cuál te queda mejor? 😊"
                            )
                        else:
                            response = (
                                f"😔 No hay turnos disponibles para ese día.\n\n"
                                f"¿Querés que te anote en la *lista de espera* por si se libera un lugar, o probamos con otra fecha? ✨"
                            )
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return welcome_back_prefix + response

                conv["fallback_count"] = 0
                conv["selected_date"] = date_str
                conv["selected_time"] = time_str
                display_date = _format_date_display(date_str)

                if not conv.get("customer_name") or not _is_valid_customer_name(conv.get("customer_name"), services_catalog):
                    response = (
                        f"Perfecto! 📅 *{display_date} a las {time_str}hs*\n\n"
                        f"Para confirmar tu turno, necesito tu *nombre completo* 😊"
                    )
                    conv["stage"] = "name_input"
                elif not conv.get("phone_confirmed"):
                    response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
                    conv["stage"] = "phone_input"
                else:
                    service = conv.get("selected_service")
                    service_display = service["name"] if service else "Servicio"
                    price = _format_price(service["price"] if service else 0)
                    response = (
                        f"✨ *Resumen de tu turno:*\n\n"
                        f"💇 Servicio: *{service_display}*\n"
                        f"💰 Precio: {price}\n"
                        f"📅 Fecha: *{display_date} a las {time_str}hs*\n"
                        f"👤 Nombre: *{conv['customer_name']}*\n"
                        f"📱 Teléfono: *{conv['customer_phone']}*\n\n"
                        f"¿Confirmamos? Escribí *sí* para reservar 💕"
                    )
                    conv["stage"] = "confirmation"

                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Increment fallback count on failed date parse
            conv["fallback_count"] = conv.get("fallback_count", 0) + 1
            if conv["fallback_count"] >= 3:
                conv["stage"] = "human_escalated"
                sender_name = conv.get("customer_name") or f"Cliente ({sender_id[-4:] if len(sender_id)>=4 else sender_id})"
                summary = build_escalation_summary(conv, message)
                await escalate_to_human(sender_id, sender_name, summary, message)
                response = "Se me está complicando interpretar la fecha u horario. Ya le avisé a Sofía para coordinar tu turno directamente por WhatsApp 💕"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Check for schedule objection / hesitation (propose waitlist or alternatives)
            is_schedule_objection = any(w in clean_msg for w in (
                "ninguno", "no puedo", "muy tarde", "muy temprano", "no me sirve", "no me convence",
                "ocupado", "otro dia", "otro día", "otro horario", "otra hora", "otra fecha",
                "no llego", "complicado", "mas temprano", "más temprano", "mas tarde", "más tarde"
            ))
            if is_schedule_objection:
                service = conv.get("selected_service") or {}
                service_name = service.get("name", "tu servicio")
                context = f"Servicio seleccionado: {service_name}. Horarios del salón: Lun a Sáb 9-19hs."
                objection_prompt = OBJECTION_HANDLING_PROMPT.replace("{message}", message).replace("{context}", context)
                ai_response = await llm_pool.get_completion_async(
                    messages=chat_history[-8:],
                    system_msg=system_personality + "\n" + objection_prompt,
                    model="llama-3.1-8b-instant",
                    max_tokens=150,
                )
                if not ai_response:
                    ai_response = (
                        f"¡Entiendo totalmente! 💕 ¿Preferís que te anote en la *lista de espera* para el sábado "
                        f"por si se libera un espacio, o te gustaría revisar opciones para otro día de la semana? ✨"
                    )
                response = _apply_output_guardrails(ai_response)
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Date clarification async
            date_clarification_prompt = DATE_CLARIFICATION_PROMPT.replace("{message}", message)
            ai_response = await llm_pool.get_completion_async(
                messages=chat_history[-8:],
                system_msg=system_personality + "\n" + date_clarification_prompt,
                max_tokens=120,
            )
            response = ai_response if ai_response else "No logré entender la fecha. ¿Me decís el día y la hora de nuevo? (Ej: _mañana 14hs_ o _jueves 16:30_) 😊"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # ---- NAME_INPUT / NAME_SELECTION ----
        elif stage in ("name_input", "name_selection"):
            clean_msg = message.strip()

            # Check if user explicitly provided a phone in this message (e.g. "mi tel es 1155443322")
            phone_cand = normalize_phone(semantic_analysis.customer_phone or clean_msg)

            # Candidate name string:
            candidate = None
            if (
                semantic_analysis.customer_name
                and not _has_name_rejection_tokens(semantic_analysis.customer_name)
            ):
                candidate = semantic_analysis.customer_name
            else:
                candidate = clean_msg
                if phone_cand:
                    # Strip out phone number and label from candidate name
                    candidate = re.sub(r"(?:\+?54\s?9?\s?)?(?:11|15)?\s?(?:\d{4}[-\s]?\d{4}|\d{8,11})", "", candidate).strip()
                    candidate = re.sub(r"\b(?:y\s+)?(?:mi\s+)?(?:tel|telefono|teléfono|cel|celular|numero|número|wpp|whatsapp)(?:\s+es)?\b", "", candidate, flags=re.IGNORECASE).strip()

            has_rejection = _has_name_rejection_tokens(candidate)
            is_valid_llm = False
            valid_extracted_name = None

            if not has_rejection and candidate:
                is_valid_llm, valid_extracted_name = await _filter_name_with_llama(candidate, chat_history)

            if not is_valid_llm or not valid_extracted_name or not _is_valid_customer_name(valid_extracted_name, services_catalog):
                # Discard any candidate customer name immediately
                conv["customer_name"] = None

                # Capture any date/time change mentioned by the user so their appointment preference is updated
                parsed_dt_change = parse_date(clean_msg)
                if parsed_dt_change:
                    conv["selected_date"], conv["selected_time"] = parsed_dt_change
                    response = (
                        "¡Disculpame! Me mareé un poquito con los días. 😅 "
                        "¿Me dirías tu nombre y apellido completo para registrar la reserva? 😊\n"
                        f"_(Te lo anoto para las {conv['selected_time']}hs. Por favor indicá tu nombre completo)_"
                    )
                else:
                    response = (
                        "¡Disculpame! Me mareé un poquito con los días. 😅 "
                        "¿Me dirías tu nombre y apellido completo para registrar la reserva? 😊\n"
                        "_(Por favor indicá tu nombre completo)_"
                    )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Valid customer name received
            name = valid_extracted_name.title()
            conv["fallback_count"] = 0
            conv["customer_name"] = name
            if clean_phone:
                remember_preference(clean_phone, "nombre", name)

            # If user explicitly provided their phone number in this turn, advance directly to confirmation!
            if phone_cand:
                conv["customer_phone"] = phone_cand
                conv["phone_confirmed"] = True
                if clean_phone:
                    remember_preference(clean_phone, "telefono", phone_cand)

                selected_services = conv.get("selected_services", [])
                if len(selected_services) >= 2:
                    service_display = " + ".join([s["name"] for s in selected_services])
                    total_price = sum(s["price"] for s in selected_services)
                    price = _format_price(total_price)
                else:
                    service = conv.get("selected_service")
                    service_display = service["name"] if service else "Servicio"
                    price = _format_price(service["price"] if service else 0)

                display_date = _format_date_display(conv.get("selected_date", ""))
                response = (
                    f"✨ *Resumen de tu turno:*\n\n"
                    f"💇 Servicio: *{service_display}*\n"
                    f"💰 Precio: {price}\n"
                    f"📅 Fecha: *{display_date} a las {conv.get('selected_time', '')}hs*\n"
                    f"👤 Nombre: *{name}*\n"
                    f"📱 Teléfono: *{phone_cand}*\n\n"
                    f"¿Confirmamos? Escribí *sí* para reservar 💕"
                )
                conv["stage"] = "confirmation"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            # Move to phone_input: Send the mandatory interactive question (NEVER assume Baileys session phone without asking!)
            conv["stage"] = "phone_input"
            conv["phone_confirmed"] = False
            response = "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # ---- PHONE_INPUT ----
        elif stage == "phone_input":
            clean_msg_lower = _strip_accents(message.strip().lower())

            # Check if user confirms keeping current WhatsApp number
            is_affirmative_keep_current = (
                _is_close_confirmation_answer(message) is True
                or any(phrase in clean_msg_lower for phrase in (
                    "este", "este mismo", "el de aca", "el de acá", "el mismo",
                    "deja este", "deja este mismo", "usa este", "usa este mismo",
                    "este numero", "este whatsapp", "este wpp", "este cel", "el actual",
                    "dejalo", "dejala", "queda este", "dejar este"
                ))
            )

            # Check if user typed a new phone number
            extracted_new_phone = normalize_phone(message)

            chosen_phone = None
            if is_affirmative_keep_current:
                raw_sender_phone = sender_id.split("@")[0] if "@" in sender_id else sender_id
                chosen_phone = normalize_phone(raw_sender_phone) or raw_sender_phone
            elif extracted_new_phone:
                chosen_phone = extracted_new_phone

            if chosen_phone:
                conv["fallback_count"] = 0
                conv["customer_phone"] = chosen_phone
                conv["phone_confirmed"] = True
                if clean_phone:
                    remember_preference(clean_phone, "telefono", chosen_phone)

                selected_services = conv.get("selected_services", [])
                if len(selected_services) >= 2:
                    service_display = " + ".join([s["name"] for s in selected_services])
                    total_price = sum(s["price"] for s in selected_services)
                    price = _format_price(total_price)
                else:
                    service = conv.get("selected_service")
                    service_display = service["name"] if service else "Servicio"
                    price = _format_price(service["price"] if service else 0)

                display_date = _format_date_display(conv.get("selected_date", ""))

                response = (
                    f"✨ *Resumen de tu turno:*\n\n"
                    f"💇 Servicio: *{service_display}*\n"
                    f"💰 Precio: {price}\n"
                    f"📅 Fecha: *{display_date} a las {conv.get('selected_time', '')}hs*\n"
                    f"👤 Nombre: *{conv.get('customer_name', '')}*\n"
                    f"📱 Teléfono: *{chosen_phone}*\n\n"
                    f"¿Confirmamos? Escribí *sí* para reservar 💕"
                )
                conv["stage"] = "confirmation"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response
            else:
                response = "Por favor, confirmame si querés usar este mismo número de WhatsApp o pasame el nuevo número con código de área (ej: 1123456789) 📱"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

        # ---- CONFIRMATION ----
        elif stage == "confirmation":
            confirmed = _is_close_confirmation_answer(message)

            if confirmed is True:
                conv["fallback_count"] = 0
                service = conv.get("selected_service")
                selected_services = conv.get("selected_services", [])
                ref_notes = conv.get("reference_notes") or ""

                if not service and selected_services:
                    service = selected_services[0]
                    conv["selected_service"] = service
                elif not service and services_catalog:
                    service = services_catalog[0]
                    conv["selected_service"] = service

                if len(selected_services) >= 2:
                    service_name_full = " + ".join([s["name"] for s in selected_services])
                    total_dur = sum(s.get("duration", 45) for s in selected_services)
                    total_pr = sum(s.get("price", 0) for s in selected_services)
                    booking_notes = f"Combinados ({len(selected_services)}): {service_name_full} | {total_dur}m | ${total_pr:,} (via {platform} bot) {ref_notes}"
                else:
                    service_name_full = service["name"] if service else "Servicio"
                    booking_notes = f"Reservado via {platform} bot {ref_notes}"

                date_str = conv.get("selected_date")
                time_str = conv.get("selected_time")
                name = conv.get("customer_name")
                phone = conv.get("customer_phone")

                # Saneamiento de fecha y hora
                is_valid_date = bool(date_str and re.match(r"^\d{4}-\d{2}-\d{2}$", str(date_str)))
                is_valid_time = bool(time_str and re.match(r"^\d{2}:\d{2}$", str(time_str)))

                if not is_valid_date or not is_valid_time:
                    logger.warning(f"Invalid date/time in confirmation for {sender_id}: date={date_str}, time={time_str}. Recovering from context.")
                    recovered_dt = None
                    if semantic_analysis.date_time_text:
                        recovered_dt = parse_date(semantic_analysis.date_time_text)
                    if not recovered_dt:
                        for h in reversed(chat_history[:-1]):
                            if h.get("role") == "user":
                                u_text = " ".join(h.get("parts", []))
                                p = parse_date(u_text)
                                if p and re.match(r"^\d{4}-\d{2}-\d{2}$", p[0]) and re.match(r"^\d{2}:\d{2}$", p[1]):
                                    recovered_dt = p
                                    break
                    if recovered_dt:
                        date_str, time_str = recovered_dt
                        conv["selected_date"] = date_str
                        conv["selected_time"] = time_str
                    else:
                        # Fallback inteligente a date_selection con Smart Gaps en vez de arrojar error
                        conv["selected_date"] = None
                        conv["selected_time"] = None
                        conv["stage"] = "date_selection"
                        s_id = service["id"] if service else ""
                        day_label, compact_slots = await _get_compact_smart_slots(s_id, max_slots=3)
                        day_str = "hoy" if day_label == "hoy" else ("mañana" if day_label == "mañana" else f"el {day_label}")
                        s_name = service["name"] if service else "tu servicio"
                        if compact_slots:
                            times_formatted = ", ".join([f"*{s}hs*" for s in compact_slots[:-1]]) + f" o *{compact_slots[-1]}hs*" if len(compact_slots) > 1 else f"*{compact_slots[0]}hs*"
                            response = (
                                f"Para confirmar tu turno de *{s_name}*, validemos el horario 💕\n\n"
                                f"Las opciones disponibles más recomendadas para {day_str} son:\n"
                                f"✨ {times_formatted}\n\n"
                                f"¿Cuál te queda más cómodo? 😊"
                            )
                        else:
                            response = (
                                f"Para confirmar tu turno de *{s_name}*, validemos el día y horario 💕\n\n"
                                f"¿Para qué día y hora preferís agendar? (Ejemplo: _\"mañana 14hs\"_) ✨"
                            )
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return welcome_back_prefix + response

                # Saneamiento de nombre de clienta
                if not _is_valid_customer_name(name, services_catalog):
                    valid_name = None
                    if clean_phone:
                        prefs = get_customer_preferences(clean_phone)
                        if prefs and prefs.get("nombre") and _is_valid_customer_name(prefs["nombre"], services_catalog):
                            valid_name = prefs["nombre"]
                    if not valid_name:
                        for h in reversed(chat_history[:-1]):
                            if h.get("role") == "user":
                                u_text = " ".join(h.get("parts", [])).strip()
                                if _is_valid_customer_name(u_text, services_catalog):
                                    valid_name = u_text
                                    break
                    name = valid_name or "Clienta"
                    conv["customer_name"] = name

                # Saneamiento de teléfono
                if not phone or len(str(phone)) < 6:
                    phone = normalize_phone(sender_id) or "5491112345678"
                    conv["customer_phone"] = phone

                appointment_date = f"{date_str}T{time_str}:00-03:00"
                result = await create_appointment_via_api(
                    date=appointment_date,
                    service_id=service["id"],
                    customer_name=name,
                    customer_phone=phone,
                    source=platform,
                    notes=booking_notes.strip(),
                )

                if result and not result.get("conflict"):
                    display_date = _format_date_display(date_str)
                    date_time_str = f"{display_date} a las {time_str}hs"
                    price_val = total_pr if len(selected_services) >= 2 else (service.get('price') if service else None)
                    price_line = f"\n💰 *Total a abonar:* {_format_price(price_val)}" if price_val else ""

                    # The Express API backend natively sends asynchronous WhatsApp notifications to the salon and customer
                    remember_preference(phone, "last_service", service_name_full)

                    response = (
                        f"🎉 *¡Turno confirmado!*\n\n"
                        f"Te esperamos el *{display_date} a las {time_str}hs* "
                        f"en *Av. Corrientes 1234, Buenos Aires*.\n"
                        f"{price_line}\n\n"
                        f"Te vamos a enviar un recordatorio por WhatsApp 📱\n\n"
                        f"¡Nos vemos! 💕✨"
                    )
                    conversations.pop(sender_id, None)
                    delete_conversation_state(sender_id)
                elif result and result.get("conflict"):
                    display_date = _format_date_display(date_str)
                    response = (
                        f"⚠️ El horario de las *{time_str}hs* para el *{display_date}* ya se encuentra ocupado. 😔\n\n"
                        f"¿Te gustaría elegir otro horario? (Por ejemplo: 11:00hs, 14:00hs, 16:00hs) 😊"
                    )
                    conv["stage"] = "date_selection"
                    save_conversation_state(sender_id, conv)
                else:
                    response = (
                        f"😔 Hubo un problema al registrar el turno en la agenda. "
                        f"Por favor, probá de nuevo o escribinos por WhatsApp "
                        f"al *+{SALON_WHATSAPP}* y te ayudamos personalmente. 💕"
                    )
                    conversations.pop(sender_id, None)
                    delete_conversation_state(sender_id)

                chat_history.append({"role": "model", "parts": [response]})
                return welcome_back_prefix + response

            elif confirmed is False:
                response = "¡Sin problema! ¿Qué querés cambiar? Podés elegir otro servicio, día u horario 😊"
                conv["stage"] = "greeting"
                conv["phone_confirmed"] = False
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response
            else:
                response = "Escribí *sí* para confirmar la reserva o *no* para cambiar algún dato 😊"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

        # ---- CONFIRM_CANCELLATION ----
        elif stage == "confirm_cancellation":
            apt = conv.get("cancelling_apt")
            confirmed = _is_close_confirmation_answer(message)

            if confirmed is True and apt:
                policy_reminder = ""
                try:
                    raw_date = apt.get("date")
                    if raw_date:
                        if isinstance(raw_date, str):
                            apt_dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(TZ_AR)
                        elif isinstance(raw_date, datetime):
                            apt_dt = raw_date if raw_date.tzinfo else TZ_AR.localize(raw_date)
                        diff_hours = (apt_dt - datetime.now(TZ_AR)).total_seconds() / 3600.0
                        if 0 <= diff_hours < 2:
                            policy_reminder = (
                                "\n\n⚠️ *Aviso de Política:* Por favor recordá para la próxima avisar con al menos "
                                "2 horas de anticipación para que otra clienta pueda aprovechar el espacio 💕"
                            )
                except Exception as date_err:
                    logger.warning(f"Error calculating cancellation window: {date_err}")

                await cancel_appointment(apt["id"])
                service_name = apt.get("service", {}).get("name", "tu servicio")
                date_display = format_appointment_datetime(apt.get("date"))
                response = (
                    f"✅ Listo, tu turno para *{service_name}* del *{date_display}* "
                    f"ha sido cancelado con éxito.{policy_reminder}\n\n"
                    f"Cuando quieras volver a visitarnos, estamos para ayudarte 💕"
                )
                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return welcome_back_prefix + response

            elif confirmed is False:
                response = "¡Excelente! Mantenemos tu turno agendado tal cual estaba. ¡Te esperamos! 💕✨"
                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return welcome_back_prefix + response

            else:
                response = "¿Deseas cancelar el turno? Respondé *sí* para confirmar o *no* para mantenerlo 😊"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

        # ---- RESCHEDULE_DATE_SELECTION ----
        elif stage == "reschedule_date_selection":
            parsed = parse_date(message)
            apt = conv.get("rescheduling_apt")

            if parsed and apt:
                date_str, time_str = parsed
                service_id = apt.get("serviceId") or apt.get("service", {}).get("id")

                if service_id:
                    availability = await get_availability(date_str, service_id)
                    matching_slot = next(
                        (s for s in (availability or []) if s.get("time") == time_str and s.get("available")),
                        None,
                    )
                    if availability and not matching_slot:
                        available_times = [s["time"] for s in availability if s.get("available")][:5]
                        times_str = ", ".join([f"*{t}hs*" for t in available_times]) if available_times else "ninguno"
                        response = f"😔 Ese horario ya está ocupado. Disponibles: {times_str}. ¿Cuál preferís? 😊"
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return welcome_back_prefix + response

                new_iso_date = f"{date_str}T{time_str}:00-03:00"
                rescheduled = await reschedule_appointment(apt["id"], new_iso_date)

                if rescheduled:
                    service_name = rescheduled.get("service", {}).get("name", "tu servicio")
                    date_display = format_appointment_datetime(rescheduled.get("date"))
                    response = (
                        f"🎉 ¡Tu turno para *{service_name}* ha sido reprogramado con éxito!\n\n"
                        f"📅 Te esperamos el *{date_display}* en *Av. Corrientes 1234, Buenos Aires* 💕✨"
                    )
                else:
                    response = "Hubo un inconveniente al reprogramar el turno. Por favor probá con otro horario o comunicate con nosotras 💕"

                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return welcome_back_prefix + response

            date_clarification_prompt = DATE_CLARIFICATION_PROMPT.replace("{message}", message)
            ai_response = await llm_pool.get_completion_async(
                messages=chat_history[-8:],
                system_msg=system_personality + "\n" + date_clarification_prompt,
                max_tokens=120,
            )
            response = ai_response if ai_response else "No logré entender el nuevo día y horario. Podés decirme: _\"jueves 15hs\"_ o _\"mañana a las 11\"_ 😊"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

        # ---- FALLBACK & AUTO-ESCALATION ----
        else:
            conv["fallback_count"] = conv.get("fallback_count", 0) + 1
            if conv["fallback_count"] >= 3:
                conv["stage"] = "human_escalated"
                sender_name = conv.get("customer_name") or f"Cliente ({sender_id[-4:] if len(sender_id)>=4 else sender_id})"
                summary = build_escalation_summary(conv, message)
                await escalate_to_human(sender_id, sender_name, summary, message)
                response = "Noto que estamos teniendo dificultades para coordinar. Ya le avisé a Sofía para que te contacte personalmente por WhatsApp y te ayude a resolver tu consulta 💕"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

            general_prompt = GENERAL_FALLBACK_PROMPT.replace("{message}", message)
            ai_response = await llm_pool.get_completion_async(
                messages=chat_history[-8:],
                system_msg=system_personality + "\n" + general_prompt,
                max_tokens=150,
            )
            response = ai_response if ai_response else "¡Hola! ¿En qué te puedo ayudar hoy en Glow Studio? 💕"
            response = _apply_output_guardrails(response)
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return welcome_back_prefix + response

    except Exception as e:
        logger.exception(f"Agent error processing message: {e}")
        try:
            conversations.pop(sender_id, None)
            delete_conversation_state(sender_id)
        except Exception as del_err:
            logger.warning(f"Error purging corrupted conversation state: {del_err}")

        try:
            services = get_services()
            catalog = format_services_catalog(services)
            response = (
                "¡Hola! Bienvenida a *Glow Studio by Sofia* 💕\n\n"
                "Tuvimos un breve inconveniente al procesar tu mensaje, pero ya reiniciamos tu consulta. "
                "¿Qué servicio te gustaría reservar hoy? ✨\n\n"
                f"{catalog}"
            )
            fresh_conv = get_conversation(sender_id)
            fresh_conv["stage"] = "service_selection"
            fresh_conv["chat_history"].append({"role": "user", "parts": [message]})
            fresh_conv["chat_history"].append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, fresh_conv)
        except Exception:
            response = (
                "Disculpá, tuvimos una breve demora al procesar tu mensaje. 😔\n"
                f"Podés consultar nuestros servicios o escribirnos directamente a "
                f"*+{SALON_WHATSAPP}*. ¡Te atenderemos encantadas! 💕"
            )
        return response
