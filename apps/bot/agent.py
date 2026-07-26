# ============================================
# Glow Studio by Sofia — Gemini AI Agent
# ============================================

import os
import json
import re
from datetime import datetime, timedelta
from typing import Optional
import pytz
from groq import Groq

from services.database import (
    get_services,
    get_service_by_name,
    get_service_by_index,
    get_conversation_state,
    save_conversation_state,
    delete_conversation_state,
)
from services.calendar import create_appointment_via_api, get_availability
from services.whatsapp import send_whatsapp_notification
from services.phone_utils import normalize_phone
from services.llm_pool import llm_pool

import logging

logger = logging.getLogger("glow_bot.agent")
TZ_AR = pytz.timezone('America/Argentina/Buenos_Aires')

# In-memory conversation state cache
conversations: dict[str, dict] = {}


def get_conversation(sender_id: str) -> dict:
    """Get or create conversation state for a sender, reading from DB."""
    db_state = get_conversation_state(sender_id)
    if db_state:
        conversations[sender_id] = db_state
        return db_state

    new_state = {
        "stage": "greeting",  # greeting, service_selection, date_selection, name_input, phone_input, confirmation
        "selected_service": None,
        "selected_date": None,
        "selected_time": None,
        "customer_name": None,
        "customer_phone": None,
        "chat_history": [],
    }
    conversations[sender_id] = new_state
    return new_state



def format_services_catalog(services: list[dict]) -> str:
    """Format services list for display in chat."""
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


import dateparser


def parse_date(text: str) -> Optional[tuple[str, str]]:
    """Try to parse a date and time from user text using regex first, then dateparser."""
    text_lower = text.lower().strip()
    today = datetime.now(TZ_AR)

    # Fast path 1: Custom regex rules
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

    time_match = re.search(r'(\d{1,2})[:\s]?(\d{2})?\s*(?:hs|hrs|h)?', text_lower)
    hour = None
    minute = 0
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)

    if target_date and hour is not None:
        if 9 <= hour <= 19:
            date_str = target_date.strftime("%Y-%m-%d")
            time_str = f"{hour:02d}:{minute:02d}"
            return date_str, time_str

    # Fast path 2: dateparser
    try:
        parsed_dt = dateparser.parse(
            text,
            languages=['es'],
            settings={
                'RELATIVE_BASE': today,
                'PREFER_DATES_FROM': 'future',
                'TIMEZONE': 'America/Argentina/Buenos_Aires',
                'RETURN_AS_TIMEZONE_AWARE': True,
            }
        )
        if parsed_dt:
            if 9 <= parsed_dt.hour <= 19:
                return parsed_dt.strftime("%Y-%m-%d"), parsed_dt.strftime("%H:%M")
    except Exception as e:
        print(f"⚠️ dateparser exception: {e}")

    return None



async def process_message(sender_id: str, message: str, platform: str = "INSTAGRAM") -> str:
    """Process an incoming message and return the bot's response."""
    conv = get_conversation(sender_id)
    chat_history = conv["chat_history"]

    # Add user message to history
    chat_history.append({"role": "user", "parts": [message]})

    try:
        # Stage-based processing
        clean_msg = message.strip().lower()
        if clean_msg in ["hola", "buenas", "buen dia", "buenas noches", "buenas tardes", "inicio", "reset", "menu", "menú"]:
            conv["stage"] = "greeting"

        stage = conv["stage"]

        # === GREETING / SERVICE SELECTION ===
        if stage == "greeting":
            services = get_services()
            catalog = format_services_catalog(services)

            response = f"¡Hola! 😊 Bienvenida a *Glow Studio by Sofia* ✨\n\n{catalog}"
            conv["stage"] = "service_selection"

        elif stage == "service_selection":
            # Try to match service by number
            try:
                num = int(message.strip())
                service = get_service_by_index(num)
            except ValueError:
                service = get_service_by_name(message)

            if service:
                conv["selected_service"] = service
                price = f"${service['price']:,}".replace(",", ".")
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
            else:
                # Use Groq to understand what they want
                system_msg = (
                    "El cliente está intentando elegir un servicio de belleza pero no fue claro. "
                    "Preguntale amablemente qué servicio quiere del catálogo o ayudalo a elegir. "
                    "Respondé corto, cálido y en argentino."
                )
                msgs = [
                    {"role": "assistant" if m["role"] == "model" else m["role"], "content": m["parts"][0]}
                    for m in chat_history[-3:]
                ]
                ai_response = llm_pool.get_completion(msgs, system_msg=system_msg)
                response = ai_response if ai_response else "No te entendí bien, ¿me repetís qué servicio buscás? 💕"


        elif stage == "date_selection":
            parsed = parse_date(message)

            if parsed:
                date_str, time_str = parsed
                conv["selected_date"] = date_str
                conv["selected_time"] = time_str

                # Format for display
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
                month_names = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
                display_date = f"{day_names[date_obj.weekday()]} {date_obj.day} de {month_names[date_obj.month - 1]}"

                response = (
                    f"Perfecto! 📅 *{display_date} a las {time_str}hs*\n\n"
                    f"Para confirmar tu turno, necesito tu *nombre completo* 😊"
                )
                conv["stage"] = "name_input"
            else:
                # Use Groq to help parse or ask again
                system_msg = (
                    f"El cliente escribió: '{message}' para elegir fecha/hora. "
                    f"No pudimos parsear la fecha. Pedile amablemente que especifique "
                    f"el día y horario de otra forma. Ejemplo: 'martes 14hs' o 'mañana a las 10'. "
                    f"Horarios: Lun-Sáb 9:00-19:00. Respondé corto y en argentino."
                )
                ai_response = llm_pool.get_completion([], system_msg=system_msg)
                response = ai_response if ai_response else "No logré entender la fecha. ¿Me decís el día y la hora de nuevo? 😊"


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
            else:
                response = "Necesito tu nombre completo para la reserva. ¿Me lo decís? 😊"

        elif stage == "phone_input":
            phone_str = normalize_phone(message)
            
            if phone_str:
                conv["customer_phone"] = phone_str

                service = conv["selected_service"]
                date_obj = datetime.strptime(conv["selected_date"], "%Y-%m-%d")
                day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
                month_names = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
                display_date = f"{day_names[date_obj.weekday()]} {date_obj.day} de {month_names[date_obj.month - 1]}"
                price = f"${service['price']:,}".replace(",", ".")

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
            else:
                response = "Necesito un número de teléfono válido. ¿Me lo pasás? 📱"

        elif stage == "confirmation":
            lower = message.lower().strip()
            if lower in ["sí", "si", "yes", "dale", "ok", "confirmo", "confirmar", "1"]:
                service = conv["selected_service"]
                date_str = conv["selected_date"]
                time_str = conv["selected_time"]
                name = conv["customer_name"]
                phone = conv["customer_phone"]

                # Create appointment via API (Adding -03:00 for Argentina Timezone)
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
                    # Format date for notification
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
                    display_date = f"{day_names[date_obj.weekday()]} {date_obj.day}"
                    date_time_str = f"{display_date} a las {time_str}hs"

                    # Send WhatsApp notification to salon
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
                        f"al *+54 9 11 7356-6392* y te ayudamos personalmente. 💕"
                    )

                # Reset conversation
                conversations.pop(sender_id, None)
                delete_conversation_state(sender_id)
            elif lower in ["no", "cancelar", "cambiar"]:
                response = "Sin problema! ¿Qué querés cambiar? Podés elegir otro servicio, día u horario 😊"
                conv["stage"] = "greeting"
            else:
                response = "Escribí *sí* para confirmar o *no* para cambiar algo 😊"

        else:
            # Fallback to Groq for any other stage
            system_msg = "Sos un asistente de salón de belleza. Respondé a la consulta amablemente, de forma muy breve y en español de Argentina."
            msgs = [
                {"role": "assistant" if m["role"] == "model" else m["role"], "content": m["parts"][0]}
                for m in chat_history[-3:]
            ]
            ai_response = llm_pool.get_completion(msgs, system_msg=system_msg)
            response = ai_response if ai_response else "¡Hola! ¿En qué te puedo ayudar? 💕"


    except Exception as e:
        logger.exception(f"Agent error processing message: {e}")
        response = (
            "Disculpá, tuve un problema procesando tu mensaje. 😔\n"
            "Podés intentar de nuevo o escribirnos por WhatsApp al "
            "*+54 9 11 7829-6781*. ¡Te ayudamos encantadas! 💕"
        )

    # Add bot response to history
    chat_history.append({"role": "model", "parts": [response]})

    # Keep history manageable
    if len(chat_history) > 20:
        chat_history[:] = chat_history[-20:]

    if conv.get("stage") == "completed":
        conversations.pop(sender_id, None)
        delete_conversation_state(sender_id)
    else:
        save_conversation_state(sender_id, conv)

    return response

