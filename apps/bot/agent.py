# ============================================
# Glow Studio by Sofia — Improved AI Agent
# ============================================

import os
import json
import re
import logging
from datetime import datetime, timedelta
from typing import Optional
import pytz

import dateparser
from groq import Groq

from services.database import (
    get_services,
    get_service_by_name,
    get_service_by_index,
    get_conversation_state,
    save_conversation_state,
    delete_conversation_state,
)
from services.calendar import (
    create_appointment_via_api,
    get_availability,
    get_upcoming_appointments,
    confirm_upcoming_appointment,
    cancel_appointment,
    reschedule_appointment,
)
from services.whatsapp import send_whatsapp_notification
from services.phone_utils import normalize_phone
from services.llm_pool import llm_pool
from services.faq_handler import get_faq_response
from services.intent_classifier import classify_intent
from services.prompts import (
    SYSTEM_PERSONALITY,
    AVAILABILITY_PROMPT,
    SERVICE_HELP_PROMPT,
    DATE_CLARIFICATION_PROMPT,
    GENERAL_FALLBACK_PROMPT,
    CLOSING_PROMPT,
    BOOKING_EXTRACTION_PROMPT,
)

logger = logging.getLogger("glow_bot.agent")
TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")

# In-memory conversation state cache
conversations: dict[str, dict] = {}

# ── Helpers ──────────────────────────────────────────────────────────────


def get_conversation(sender_id: str) -> dict:
    """Get or create conversation state for a sender, reading from DB."""
    db_state = get_conversation_state(sender_id)
    if db_state:
        conversations[sender_id] = db_state
        return db_state

    new_state = {
        "stage": "greeting",
        "selected_service": None,
        "selected_date": None,
        "selected_time": None,
        "customer_name": None,
        "customer_phone": None,
        "chat_history": [],
        # Temp fields for multi-step flows
        "cancelling_apt": None,
        "rescheduling_apt": None,
        "upcoming_apts": [],
    }
    conversations[sender_id] = new_state
    return new_state


def format_services_catalog(services: list[dict]) -> str:
    """Format services list for display in chat."""
    if not services:
        return "_No hay servicios disponibles en este momento. Intentá de nuevo más tarde._"

    lines = ["✨ *Nuestros Servicios* ✨\n"]
    for i, s in enumerate(services, 1):
        price = f"${s['price']:,}".replace(",", ".")
        duration_min = s["duration"]
        if duration_min >= 60:
            hours = duration_min // 60
            mins = duration_min % 60
            duration = f"{hours}h" + (f" {mins}min" if mins else "")
        else:
            duration = f"{duration_min}min"
        lines.append(f"{i}. 💇 *{s['name']}* — {price} ({duration})")
        if s.get("description"):
            lines.append(f"   _{s['description']}_")
        lines.append("")
    lines.append("Escribí el número o nombre del servicio que te interesa 😊")
    return "\n".join(lines)


def format_appointment_datetime(iso_or_dt) -> str:
    """Format appointment ISO string or datetime into friendly Spanish text."""
    if not iso_or_dt:
        return "fecha no especificada"
    try:
        if isinstance(iso_or_dt, str):
            dt_clean = iso_or_dt.replace("Z", "+00:00")
            dt = datetime.fromisoformat(dt_clean).astimezone(TZ_AR)
        else:
            dt = iso_or_dt.astimezone(TZ_AR)

        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        month_names = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ]
        day_str = day_names[dt.weekday()]
        month_str = month_names[dt.month - 1]
        return f"{day_str} {dt.day} de {month_str} a las {dt.strftime('%H:%M')}hs"
    except Exception as e:
        logger.warning(f"Error formatting date {iso_or_dt}: {e}")
        return str(iso_or_dt)[:16]


def _format_date_display(date_str: str) -> str:
    """Format YYYY-MM-DD → 'Lunes 15 de agosto'."""
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        month_names = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ]
        return f"{day_names[date_obj.weekday()]} {date_obj.day} de {month_names[date_obj.month - 1]}"
    except Exception:
        return date_str


def _format_price(price: int) -> str:
    """Format price int → $15.000 (con punto)."""
    return f"${price:,}".replace(",", ".")


def _is_close_confirmation_answer(text: str) -> bool:
    """Check if message is a clear 'yes' or 'no' to a confirmation prompt."""
    t = text.lower().strip()
    yes_phrases = {"sí", "si", "yes", "dale", "ok", "confirmo", "confirmar",
                   "1", "así es", "perfecto", "vamos", "dale boludo", "chévere",
                   "bueno", "acepto", "confirmado"}
    no_phrases = {"no", "nope", "nah", "cancelar", "cambiar", "no quiero",
                  "me hace", "no voy", "ni en Cuando", "tampoco"}
    if t in yes_phrases:
        return True
    if t in no_phrases:
        return False
    # Also check for 'sí, ...' or 'no, ...'
    if t.startswith(("sí", "si", "yes")):
        return True
    if t.startswith(("no", "nope", "nah", "cancelar")):
        return False
    return None  # ambiguous


def _parse_message_with_llm(message: str, services: list[dict]) -> dict:
    """Use LLM to extract service name + date from a booking-like message."""
    services_summary = "\n".join([
        f"  - {s['name']} (${s['price']:,} ARS, {s['duration']}min)" 
        for s in services
    ])

    prompt = BOOKING_EXTRACTION_PROMPT.format(
        message=message,
    )
    
    try:
        raw = llm_pool.get_completion([], system_msg=prompt)
        if raw:
            # Parse JSON from LLM response
            raw = raw.strip()
            # Find JSON object in the response
            json_start = raw.find("{")
            json_end = raw.rfind("}")
            if json_start >= 0 and json_end >= 0:
                try:
                    data = json.loads(raw[json_start:json_end + 1])
                    return {"servicio": data.get("servicio"), "fecha": data.get("fecha")}
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        logger.warning(f"Booking extraction LLM failed: {e}")

    return {"servicio": None, "fecha": None}


# ── Date Parsing ─────────────────────────────────────────────────────────


def parse_date(text: str) -> Optional[tuple[str, str]]:
    """Try to parse a date and time from user text."""
    text_lower = text.lower().strip()
    today = datetime.now(TZ_AR)

    # Reject Sundays explicitly (salon closed)
    if "domingo" in text_lower:
        return None

    # --- Fast path: custom rules ---
    day_map = {
        "lunes": 0, "martes": 1, "miércoles": 2, "miercoles": 2,
        "jueves": 3, "viernes": 4, "sábado": 5, "sabado": 5,
    }

    target_date = None
    if "mañana" in text_lower or "manana" in text_lower:
        target_date = today + timedelta(days=1)
    elif "pasado" in text_lower:
        target_date = today + timedelta(days=2)
    elif "hoy" in text_lower:
        target_date = today
    else:
        for day_name, day_num in day_map.items():
            if day_name in text_lower:
                days_ahead = day_num - today.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                target_date = today + timedelta(days=days_ahead)
                break

    # Extract time
    time_match = re.search(r'(\d{1,2})[:\s]?(\d{2})?\s*(?:hs|hrs|h)?', text_lower)
    hour = None
    minute = 0
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)
        # Adjust 12h-23h for common typos
        if hour < 9:
            hour += 12  # e.g. "9" → 9 (OK), "20" → 20 (OK), "8" → may be 20?

    if target_date and hour is not None:
        if target_date.weekday() == 6:
            return None
        if 9 <= hour <= 19:
            date_str = target_date.strftime("%Y-%m-%d")
            time_str = f"{hour:02d}:{minute:02d}"
            return date_str, time_str

    # --- dateparser fallback ---
    try:
        parsed_dt = dateparser.parse(
            text,
            languages=["es"],
            settings={
                "RELATIVE_BASE": today,
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
) -> str:
    """Process an incoming message and return the bot's response."""
    conv = get_conversation(sender_id)
    chat_history = conv["chat_history"]

    # Add user message to history
    chat_history.append({"role": "user", "parts": [message]})

    try:
        # ──── STEP 1: Intent Classification ───────────────────────────
        intent = classify_intent(message)

        # ──── STEP 2: Handle closures / thanks (always, regardless of stage) ────
        if intent == "THANKS":
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
            return response

        if intent == "SMALL_TALK":
            response = (
                "¡Qué lindo! 💕 ¿Querés reservar un turno? "
                "Decime qué servicio te gusta y te lo encontrámos ✨"
            )
            chat_history.append({"role": "model", "parts": [response]})
            conv["stage"] = "service_selection"
            save_conversation_state(sender_id, conv)
            return response

        # ──── STEP 3: Intent Interception (before booking flow) ───────
        # These intents are handled in the interception block only when
        # we're not deep into a multi-step booking flow.
        # If we are in a mid-flow stage, let the flow handle it.

        flow_stages = {
            "greeting", "service_selection", "date_selection",
            "name_input", "phone_input", "confirmation",
        }

        # En etapas de booking flujo, CANCEL_APPOINTMENT y RESCHEDULE_APPOINTMENT
        # deben ser atendidos incluso si estamos en medio del flujo.
        # El usuario puede cancelar/reprogramar en cualquier momento.
        if conv["stage"] in flow_stages:
            # ─── CONFIRM_APPOINTMENT ───
            if intent == "CONFIRM_APPOINTMENT":
                clean_phone = normalize_phone(sender_id)
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
                    return response
                else:
                    # Confirmación pero no hay turno pendiente
                    response = (
                        "No encontré un turno pendiente que confirmar. "
                        "Si querés reservar uno nuevo, escribí *reservar* 😊"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response

            # ─── CANCEL_APPOINTMENT ───
            elif intent == "CANCEL_APPOINTMENT":
                clean_phone = normalize_phone(sender_id)
                upcoming = await get_upcoming_appointments(
                    phone=clean_phone, instagram=sender_id
                )
                if not upcoming:
                    response = (
                        "No encontré ningún turno activo agendado. "
                        "¿Querés reservar uno? Escribí *reservar* 😊"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response
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
                    return response
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
                    return response

            # ─── RESCHEDULE_APPOINTMENT ───
            elif intent == "RESCHEDULE_APPOINTMENT":
                clean_phone = normalize_phone(sender_id)
                upcoming = await get_upcoming_appointments(
                    phone=clean_phone, instagram=sender_id
                )
                if not upcoming:
                    response = (
                        "No encontré ningún turno activo para reprogramar. "
                        "¿Querés reservar un turno nuevo? Escribí *reservar* 😊"
                    )
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response
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
                    return response
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
                    return response

            # ─── FAQ_INTENTS ───
            faq_map = {
                "FAQ_UBICACION": "ubicacion",
                "FAQ_HORARIO": "horario",
                "FAQ_SERVICIOS": "servicios",
                "FAQ_PAGOS": "metodos_pago",
                "FAQ_CANCELACION": "cancelacion",
            }
            if intent in faq_map:
                faq_response = get_faq_response(faq_map[intent])
                if faq_response:
                    response = faq_response + "\n\n¿Querés reservar un turno? Escribí *turno* o *reservar* 😊"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response

        # ──── STEP 4: Stage-based handling ────────────────────────────

        stage = conv["stage"]

        # Reset stage on explicit commands
        clean_msg = message.strip().lower()
        if clean_msg in ("hola", "buenas", "buen día", "buen dia", "buenas tardes",
                         "buenas noches", "inicio", "reset", "menu", "menú",
                         "empieza", "empezar de nuevo"):
            conv["stage"] = "greeting"

        # ---- GREETING ----
        if stage == "greeting":
            services = get_services()
            catalog = format_services_catalog(services)
            response = f"¡Hola! 😊 Bienvenida a *Glow Studio by Sofia* ✨\n\n{catalog}"
            conv["stage"] = "service_selection"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

        # ---- SERVICE_SELECTION ----
        elif stage == "service_selection":
            # Try to match service by number or name
            service = None
            try:
                num = int(message.strip())
                service = get_service_by_index(num)
            except ValueError:
                service = get_service_by_name(message)

            if service:
                conv["selected_service"] = service
                price = _format_price(service["price"])
                duration_min = service["duration"]
                if duration_min >= 60:
                    hours = duration_min // 60
                    mins = duration_min % 60
                    duration = f"{hours}h" + (f" {mins}min" if mins else "")
                else:
                    duration = f"{duration_min}min"

                response = (
                    f"¡Excelente elección! ✨ *{service['name']}* — {price} ({duration})\n\n"
                    f"Nuestros horarios son Lunes a Sábado de 9:00 a 19:00.\n\n"
                    f"Podés decirme algo como: _\"martes 14hs\"_ o _\"mañana a las 10\"_"
                )
                conv["stage"] = "date_selection"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

            # Service not found by name/number → LLM help
            services = get_services()
            services_catalog = format_services_catalog(services)
            service_help_prompt = SERVICE_HELP_PROMPT.format(
                services_catalog=services_catalog, message=message
            )
            ai_response = llm_pool.get_completion([], system_msg=service_help_prompt)
            response = ai_response if ai_response else (
                "No te entendí bien, ¿me repetís qué servicio buscás? 💕"
            )
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

        # ---- DATE_SELECTION ----
        elif stage == "date_selection":
            parsed = parse_date(message)

            if parsed:
                date_str, time_str = parsed
                service = conv["selected_service"]

                if service:
                    availability = await get_availability(date_str, service["id"])
                    matching_slot = next(
                        (s for s in availability if s.get("time") == time_str and s.get("available")),
                        None,
                    )
                    if availability and not matching_slot:
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
                                f"¿Querés probar con otro día? Ejemplo: _\"martes 14hs\"_ 😊"
                            )
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return response

                # Accept the date
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
                return response

            # Date parse failed → LLM helps to clarify
            date_clarification_prompt = DATE_CLARIFICATION_PROMPT.format(message=message)
            ai_response = llm_pool.get_completion([], system_msg=date_clarification_prompt)
            response = ai_response if ai_response else (
                "No logré entender la fecha. ¿Me decís el día y la hora de nuevo? 😊"
            )
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

        # ---- NAME_INPUT ----
        elif stage == "name_input":
            name = message.strip()
            if len(name) >= 2:
                conv["customer_name"] = name
                response = (
                    f"Gracias *{name}* 💕\n\n"
                    f"Por último, ¿cuál es tu número de teléfono o WhatsApp con código de país? 📱\n"
                    f"_(ejemplo: 541166496150)_"
                )
                conv["stage"] = "phone_input"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response
            else:
                response = "Necesito tu nombre completo para la reserva. ¿Me lo decís? 😊"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

        # ---- PHONE_INPUT ----
        elif stage == "phone_input":
            phone_str = normalize_phone(message)

            if phone_str:
                conv["customer_phone"] = phone_str
                service = conv["selected_service"]
                display_date = _format_date_display(conv["selected_date"])
                price = _format_price(service["price"])

                response = (
                    f"✨ *Resumen de tu turno:*\n\n"
                    f"💇 Servicio: *{service['name']}*\n"
                    f"💰 Precio: {price}\n"
                    f"📅 Fecha: *{display_date} a las {conv['selected_time']}hs*\n"
                    f"👤 Nombre: *{conv['customer_name']}*\n"
                    f"📱 Teléfono: *{phone_str}*\n\n"
                    f"¿Confirmamos? Escribí *sí* para reservar 💕"
                )
                conv["stage"] = "confirmation"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response
            else:
                response = "Necesito un número de teléfono válido. ¿Me lo pasás? 📱"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

        # ---- CONFIRMATION ----
        elif stage == "confirmation":
            lower = message.lower().strip()
            confirmed = _is_close_confirmation_answer(message)

            if confirmed is True:
                service = conv["selected_service"]
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
                    notes=f"Reservado via {platform} bot",
                )

                if result:
                    display_date = _format_date_display(date_str)
                    date_time_str = f"{display_date} a las {time_str}hs"

                    await send_whatsapp_notification(name, service["name"], date_time_str)

                    response = (
                        f"🎉 *¡Turno confirmado!*\n\n"
                        f"Te esperamos el *{display_date} a las {time_str}hs* "
                        f"en *Av. Corrientes 1234, Buenos Aires*.\n\n"
                        f"Te vamos a enviar un recordatorio por WhatsApp 📱\n\n"
                        f"¡Nos vemos! 💕✨"
                    )
                else:
                    response = (
                        f"😔 Hubo un problema al reservar. "
                        f"Por favor, intentá de nuevo o escribinos por WhatsApp "
                        f"al *+54 9 11 7829-6781* y te ayudamos personalmente. 💕"
                    )

                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return response

            elif confirmed is False:
                # User said "no" to confirmation → go back to greeting
                response = "Sin problema! ¿Qué querés cambiar? Podés elegir otro servicio, día u horario 😊"
                conv["stage"] = "greeting"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

            else:
                response = "Escribí *sí* para confirmar o *no* para cambiar algo 😊"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

        # ---- CONFIRM_CANCELLATION ----
        elif stage == "confirm_cancellation":
            apt = conv.get("cancelling_apt")
            lower = message.lower().strip()
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
                return response

            elif confirmed is False:
                response = "¡Excelente! Mantenemos tu turno agendado tal cual estaba. ¡Te esperamos! 💕✨"
                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return response

            else:
                response = "¿Deseas cancelar el turno? Por favor respondé *sí* para confirmar la cancelación o *no* para mantenerlo 😊"
                chat_history.append({"role": "model", "parts": [response]})
                save_conversation_state(sender_id, conv)
                return response

        # ---- SELECT_APPOINTMENT_TO_CANCEL ----
        elif stage == "select_apt_to_cancel":
            apts = conv.get("upcoming_apts", [])
            try:
                idx = int(message.strip()) - 1
                if 0 <= idx < len(apts):
                    selected = apts[idx]
                    conv["cancelling_apt"] = selected
                    conv["stage"] = "confirm_cancellation"
                    s_name = selected.get("service", {}).get("name", "Servicio")
                    d_str = format_appointment_datetime(selected.get("date"))
                    response = f"¿Confirmás que querés cancelar el turno de *{s_name}* del *{d_str}*? Escribí *sí* o *no* 💕"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response
                else:
                    response = f"Por favor escribí un número del 1 al {len(apts)} 😊"
            except ValueError:
                response = f"Por favor escribí el número del turno que querés cancelar (1 al {len(apts)}) 😊"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

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
                        (s for s in availability if s.get("time") == time_str and s.get("available")),
                        None,
                    )
                    if availability and not matching_slot:
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
                                f"¿Querés probar con otro día? Ejemplo: _\"viernes 16hs\"_ 😊"
                            )
                        chat_history.append({"role": "model", "parts": [response]})
                        save_conversation_state(sender_id, conv)
                        return response

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
                    response = "Hubo un inconveniente al reprogramar el turno. Por favor probá con otro horario o comunicate directamente con nosotras 💕"

                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
                chat_history.append({"role": "model", "parts": [response]})
                return response

            # Parse failed
            date_clarification_prompt = DATE_CLARIFICATION_PROMPT.format(message=message)
            ai_response = llm_pool.get_completion([], system_msg=date_clarification_prompt)
            response = ai_response if ai_response else (
                "No logré entender el nuevo día y horario. Podés decirme por ejemplo: _\"jueves 15hs\"_ o _\"mañana a las 11\"_ 😊"
            )
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

        # ---- SELECT_APPOINTMENT_TO_RESCHEDULE ----
        elif stage == "select_apt_to_reschedule":
            apts = conv.get("upcoming_apts", [])
            try:
                idx = int(message.strip()) - 1
                if 0 <= idx < len(apts):
                    selected = apts[idx]
                    conv["rescheduling_apt"] = selected
                    conv["stage"] = "reschedule_date_selection"
                    s_name = selected.get("service", {}).get("name", "Servicio")
                    d_str = format_appointment_datetime(selected.get("date"))
                    response = f"Turno seleccionado: *{s_name}* ({d_str}).\n\n¿Para qué nuevo día y hora querés pasarlo? (Ejemplo: _\"martes 14hs\"_) 😊"
                    chat_history.append({"role": "model", "parts": [response]})
                    save_conversation_state(sender_id, conv)
                    return response
                else:
                    response = f"Por favor escribí un número del 1 al {len(apts)} 😊"
            except ValueError:
                response = f"Por favor escribí el número del turno que querés reprogramar (1 al {len(apts)}) 😊"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

        # ---- FALLBACK (unhandled stage) ----
        else:
            # Use LLM for anything else
            general_prompt = GENERAL_FALLBACK_PROMPT.format(message=message)
            ai_response = llm_pool.get_completion([], system_msg=general_prompt)
            response = ai_response if ai_response else "¡Hola! ¿En qué te puedo ayudar? 💕"
            chat_history.append({"role": "model", "parts": [response]})
            save_conversation_state(sender_id, conv)
            return response

    except Exception as e:
        logger.exception(f"Agent error processing message: {e}")
        response = (
            "Disculpá, tuve un problema procesando tu mensaje. 😔\n"
            "Podés intentar de nuevo o escribirnos por WhatsApp al "
            "*+54 9 11 7829-6781*. ¡Te ayudamos encantadas! 💕"
        )
        chat_history.append({"role": "model", "parts": [response]})
        save_conversation_state(sender_id, conv)
        return response

    # Add bot response to history (if not returned early)
    chat_history.append({"role": "model", "parts": [response]})

    # Keep history manageable
    if len(chat_history) > 20:
        chat_history[:] = chat_history[-20:]

    # Auto-cleanup if conversation is completed
    if conv.get("stage") == "completed":
        conversations.pop(sender_id, None)
        delete_conversation_state(sender_id)
    else:
        save_conversation_state(sender_id, conv)

    return response
