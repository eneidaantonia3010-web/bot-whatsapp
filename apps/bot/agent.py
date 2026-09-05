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
)
from services.calendar import (
    create_appointment_via_api,
    get_availability,
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
from services.memory import format_memory_system_context, remember_preference, extract_and_remember_preferences
from services.admin_commands import handle_admin_command
from services.prompts import (
    SERVICE_HELP_PROMPT,
    DATE_CLARIFICATION_PROMPT,
    GENERAL_FALLBACK_PROMPT,
    BOOKING_EXTRACTION_PROMPT,
    MULTI_SERVICE_EXTRACTION_PROMPT,
    SYSTEM_PERSONALITY_MAP,
)
from services.formatters import (
    format_services_catalog,
    format_appointment_datetime,
    _format_date_display,
    _format_price,
    _is_close_confirmation_answer,
    _apply_output_guardrails,
)

logger = logging.getLogger("glow_bot.agent")
TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")

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
        "chat_history": [],
        "language": "es",
        "last_message_at": datetime.now(TZ_AR).isoformat(),
        "fallback_count": 0,
        "low_confidence_count": 0,
        "cancelling_apt": None,
        "rescheduling_apt": None,
        "upcoming_apts": [],
        "reference_notes": None,
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


def _strip_accents(text: str) -> str:
    import unicodedata
    return "".join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )


def parse_date(text: str) -> tuple[str, str] | None:
    """Parse human date/time from Spanish text into (YYYY-MM-DD, HH:MM)."""
    norm_text = _strip_accents(text.strip())
    today = datetime.now(TZ_AR).date()

    day_map = {
        "lunes": 0, "martes": 1, "miercoles": 2,
        "jueves": 3, "viernes": 4, "sabado": 5,
    }

    target_date = None
    if re.search(r'ma.?ana', norm_text) or "tomorrow" in norm_text:
        target_date = today + timedelta(days=1)
    elif re.search(r'pasado\s*ma.?ana', norm_text) or "pasado" in norm_text:
        target_date = today + timedelta(days=2)
    elif "hoy" in norm_text or "today" in norm_text:
        target_date = today
    else:
        for day_name, day_num in day_map.items():
            if day_name in norm_text:
                days_ahead = day_num - today.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                target_date = today + timedelta(days=days_ahead)
                break

    # Extract time with explicit context requirement (hs, hrs, :, a las, etc.)
    has_time_context = bool(re.search(r'(?:a\s+las\s+\d{1,2}|\d{1,2}\s*(?:hs|hrs|h|am|pm|de\s+la\s+tarde|de\s+la\s+manana)|\d{1,2}:\d{2})', norm_text))
    
    hour = None
    minute = 0
    if has_time_context:
        colon_match = re.search(r'(\d{1,2}):(\d{2})', norm_text)
        word_match = re.search(r'(?:a\s+las\s+(\d{1,2})|(\d{1,2})\s*(?:hs|hrs|h|am|pm))(?:\s*(de\s+la\s+tarde|de\s+la\s+manana|de\s+la\s+noche|am|pm))?', norm_text)

        if colon_match:
            raw_h = int(colon_match.group(1))
            raw_m = int(colon_match.group(2))
            hour = raw_h
            minute = raw_m
        elif word_match:
            raw_h = int(word_match.group(1) or word_match.group(2))
            qualifier = (word_match.group(3) or "").strip()
            if "tarde" in qualifier or "noche" in qualifier or qualifier == "pm":
                hour = raw_h + 12 if raw_h < 12 else raw_h
            elif "manana" in qualifier or qualifier == "am":
                hour = raw_h if raw_h != 12 else 0
            else:
                if 1 <= raw_h <= 7:
                    hour = raw_h + 12
                else:
                    hour = raw_h
            minute = 0

    if target_date and hour is not None:
        if target_date.weekday() == 6:  # Sunday
            return None
        if 9 <= hour <= 19:
            date_str = target_date.strftime("%Y-%m-%d")
            time_str = f"{hour:02d}:{minute:02d}"
            return date_str, time_str
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
            if 9 <= parsed_dt.hour <= 19 and has_time_context:
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
            except Exception as e:
                logger.warning(f"Error checking session freshness: {e}")

        conv["last_message_at"] = datetime.now(TZ_AR).isoformat()
        chat_history.append({"role": "user", "parts": [message]})

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
        system_personality = SYSTEM_PERSONALITY_MAP.get(lang, SYSTEM_PERSONALITY_MAP["es"]) + memory_context

        # STEP 1: Intent Classification with Confidence Scoring (Non-blocking async)
        intent, confidence = await classify_intent_with_confidence_async(message)
        logger.info(f"Intent classified for {sender_id}: {intent} (confidence={confidence:.2f})")

        # Track consecutive low-confidence classifications (ignore standard navigation words)
        clean_msg_nav = message.strip().lower()
        is_nav_command = any(w in clean_msg_nav for w in ("hola", "inicio", "reset", "menu", "menú", "bot", "empezar", "reiniciar", "reservar", "turno", "servicios"))

        if not is_nav_command and (confidence < CONFIDENCE_THRESHOLD or intent == "UNKNOWN"):
            conv["low_confidence_count"] = conv.get("low_confidence_count", 0) + 1
            logger.info(f"Low confidence count for {sender_id}: {conv['low_confidence_count']}")
        else:
            conv["low_confidence_count"] = 0

        # EXPERT HUMAN ESCALATION & PAUSED STATE TRIGGER:
        # Triggered by explicit operator request OR 2 consecutive low-confidence classifications
        if intent == "HUMAN_ESCALATION" or conv.get("low_confidence_count", 0) >= 2:
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
            if intent == "CONFIRM_APPOINTMENT":
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
                    response = (
                        f"📅 Tenés un turno agendado:\n"
                        f"💇 *{service_name}*\n"
                        f"⏰ *{date_display}*\n\n"
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
            if intent in faq_map:
                conv["fallback_count"] = 0
                faq_response = get_faq_response(faq_map[intent])
                if faq_response:
                    response = faq_response + "\n\n¿Querés reservar un turno? Escribí *turno* o *reservar* 😊"
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

        # ---- GREETING ----
        if stage == "greeting":
            conv["fallback_count"] = 0
            services = get_services()
            catalog = format_services_catalog(services)

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
            if not matched_service:
                matched_service = get_service_by_name(message)

            if matched_service:
                conv["fallback_count"] = 0
                conv["selected_service"] = matched_service
                conv["selected_services"] = [matched_service]
                conv["stage"] = "date_selection"

                price_str = _format_price(matched_service["price"])
                response = (
                    f"¡Excelente elección! 💇 *{matched_service['name']}* "
                    f"({price_str}, {matched_service['duration']}min).\n\n"
                    f"¿Para qué día y hora te gustaría reservar? "
                    f"(ejemplo: _\"mañana 14hs\"_, _\"jueves 16:30\"_ o _\"el 15 a las 11\"_) ✨"
                )
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)

                gallery = get_gallery_image_for_category(matched_service.get("category", ""))
                if gallery and gallery.get("url"):
                    return {"response": welcome_back_prefix + response, "image_url": gallery["url"]}
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
            services_catalog = format_services_catalog(services)
            service_help_prompt = SERVICE_HELP_PROMPT.replace("{services_catalog}", services_catalog).replace("{message}", message)
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

            # Aviso explícito si menciona domingo
            if "domingo" in clean_msg:
                response = "Recordá que los domingos el salón permanece cerrado. Abrimos de *Lunes a Sábado de 9:00 a 19:00hs* ✨ ¿Qué otro día te queda cómodo?"
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

                response = (
                    f"Perfecto! 📅 *{display_date} a las {time_str}hs*\n\n"
                    f"Para confirmar tu turno, necesito tu *nombre completo* 😊"
                )
                conv["stage"] = "name_input"
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

        # ---- NAME_INPUT ----
        elif stage == "name_input":
            name = message.strip()
            if len(name) >= 2:
                conv["fallback_count"] = 0
                conv["customer_name"] = name
                response = (
                    f"Gracias *{name}* 💕\n\n"
                    f"Por último, ¿cuál es tu número de teléfono o WhatsApp con código de país? 📱\n"
                    f"_(ejemplo: 541166496150)_"
                )
                conv["stage"] = "phone_input"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response
            else:
                response = "Necesito tu nombre completo para la reserva. ¿Me lo decís? 😊"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

        # ---- PHONE_INPUT ----
        elif stage == "phone_input":
            phone_str = normalize_phone(message)
            if phone_str:
                conv["fallback_count"] = 0
                conv["customer_phone"] = phone_str
                selected_services = conv.get("selected_services", [])
                if len(selected_services) >= 2:
                    service_display = " + ".join([s["name"] for s in selected_services])
                    total_price = sum(s["price"] for s in selected_services)
                    price = _format_price(total_price)
                else:
                    service = conv["selected_service"]
                    service_display = service["name"] if service else "Servicio"
                    price = _format_price(service["price"] if service else 0)

                display_date = _format_date_display(conv["selected_date"])

                response = (
                    f"✨ *Resumen de tu turno:*\n\n"
                    f"💇 Servicio: *{service_display}*\n"
                    f"💰 Precio: {price}\n"
                    f"📅 Fecha: *{display_date} a las {conv['selected_time']}hs*\n"
                    f"👤 Nombre: *{conv['customer_name']}*\n"
                    f"📱 Teléfono: *{phone_str}*\n\n"
                    f"¿Confirmamos? Escribí *sí* para reservar 💕"
                )
                conv["stage"] = "confirmation"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response
            else:
                response = "Necesito un número de teléfono válido. ¿Me lo pasás? 📱"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return welcome_back_prefix + response

        # ---- CONFIRMATION ----
        elif stage == "confirmation":
            confirmed = _is_close_confirmation_answer(message)

            if confirmed is True:
                conv["fallback_count"] = 0
                service = conv["selected_service"]
                selected_services = conv.get("selected_services", [])
                ref_notes = conv.get("reference_notes") or ""

                if len(selected_services) >= 2:
                    service_name_full = " + ".join([s["name"] for s in selected_services])
                    total_dur = sum(s.get("duration", 45) for s in selected_services)
                    total_pr = sum(s.get("price", 0) for s in selected_services)
                    booking_notes = f"Combinados ({len(selected_services)}): {service_name_full} | {total_dur}m | ${total_pr:,} (via {platform} bot) {ref_notes}"
                else:
                    service_name_full = service["name"] if service else "Servicio"
                    booking_notes = f"Reservado via {platform} bot {ref_notes}"

                date_str = conv["selected_date"]
                time_str = conv["selected_time"]
                name = conv["customer_name"]
                phone = conv["customer_phone"]

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

                    await send_whatsapp_notification(name, service_name_full, date_time_str, price_val)
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
                await cancel_appointment(apt["id"])
                service_name = apt.get("service", {}).get("name", "tu servicio")
                date_display = format_appointment_datetime(apt.get("date"))
                response = (
                    f"✅ Listo, tu turno para *{service_name}* del *{date_display}* "
                    f"ha sido cancelado con éxito.\n\n"
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
        response = (
            "Disculpá, tuvimos una breve demora al procesar tu mensaje. 😔\n"
            f"Podés consultar nuestros servicios o escribirnos directamente a "
            f"*+{SALON_WHATSAPP}*. ¡Te atenderemos encantadas! 💕"
        )
        try:
            if "conv" in locals() and isinstance(conv, dict):
                history = conv.get("chat_history")
                if isinstance(history, list):
                    history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
        except Exception as save_err:
            logger.warning(f"Failed to record fallback response: {save_err}")
        return response
