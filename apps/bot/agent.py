# ============================================
# Glow Studio by Sofia — Gemini AI Agent
# ============================================

import os
import json
import re
from datetime import datetime, timedelta
from typing import Optional
from groq import Groq

from services.database import get_services, get_service_by_name, get_service_by_index
from services.calendar import create_appointment_via_api, get_availability
from services.whatsapp import send_whatsapp_notification


# In-memory conversation state per sender
conversations: dict[str, dict] = {}


def get_conversation(sender_id: str) -> dict:
    """Get or create conversation state for a sender."""
    if sender_id not in conversations:
        conversations[sender_id] = {
            "stage": "greeting",  # greeting, service_selection, date_selection, name_input, phone_input, confirmation
            "selected_service": None,
            "selected_date": None,
            "selected_time": None,
            "customer_name": None,
            "customer_phone": None,
            "chat_history": [],
        }
    return conversations[sender_id]


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


def parse_date(text: str) -> Optional[tuple[str, str]]:
    """Try to parse a date and time from user text."""
    text = text.lower().strip()
    today = datetime.now()

    # Patterns like "martes 14hs", "lunes a las 10", "mañana 15:00"
    day_map = {
        "lunes": 0, "martes": 1, "miércoles": 2, "miercoles": 2,
        "jueves": 3, "viernes": 4, "sábado": 5, "sabado": 5,
    }

    target_date = None

    # Check for "mañana"
    if "mañana" in text or "manana" in text:
        target_date = today + timedelta(days=1)
    # Check for "pasado" (day after tomorrow)
    elif "pasado" in text:
        target_date = today + timedelta(days=2)
    # Check for "hoy"
    elif "hoy" in text:
        target_date = today
    else:
        # Check for day names
        for day_name, day_num in day_map.items():
            if day_name in text:
                days_ahead = day_num - today.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                target_date = today + timedelta(days=days_ahead)
                break

    # Parse time
    time_match = re.search(r'(\d{1,2})[:\s]?(\d{2})?\s*(?:hs|hrs|h)?', text)
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

    return None


async def process_message(sender_id: str, message: str, platform: str = "INSTAGRAM") -> str:
    """Process an incoming message and return the bot's response."""
    conv = get_conversation(sender_id)
    chat_history = conv["chat_history"]

    # Add user message to history
    chat_history.append({"role": "user", "parts": [message]})

    try:
        # Stage-based processing
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
                    f"mostrá el catálogo de nuevo si es necesario. "
                    f"Servicios: 1.Corte Signature $25.000, 2.Corte Hombre $15.000, "
                    f"3.Uñas Gel $28.000, 4.Esmaltado Semi $18.000, "
                    f"5.Facial Glow $35.000, 6.Keratina $45.000"
                )
                response = ai_response.text

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
                ai_response = None
                groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", os.getenv("GEMINI_API_KEY", "")).split(",") if k.strip()]
                if not groq_keys: groq_keys = [""]
                
                for key in groq_keys:
                    try:
                        client = Groq(api_key=key)
                        msgs = [{"role": "system", "content": system_msg}]
                        comp = client.chat.completions.create(messages=msgs, model="llama-3.1-8b-instant")
                        ai_response = comp.choices[0].message.content
                        break
                    except Exception:
                        continue
                        
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
            phone = message.strip()
            phone_str = "".join(filter(str.isdigit, phone))
            
            if len(phone_str) >= 6:
                if not phone_str.startswith("54"):
                    phone_str = "54" + phone_str
                
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

                # Create appointment via API
                appointment_date = f"{date_str}T{time_str}:00"
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
                        f"al *+54 11 5555-4444* y te ayudamos personalmente. 💕"
                    )

                # Reset conversation
                conversations.pop(sender_id, None)
            elif lower in ["no", "cancelar", "cambiar"]:
                response = "Sin problema! ¿Qué querés cambiar? Podés elegir otro servicio, día u horario 😊"
                conv["stage"] = "greeting"
            else:
                response = "Escribí *sí* para confirmar o *no* para cambiar algo 😊"

        else:
            # Fallback to Groq for any other stage
            system_msg = "Sos un asistente de salón de belleza. Respondé a la consulta amablemente, de forma muy breve y en español de Argentina."
            ai_response = None
            groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", os.getenv("GEMINI_API_KEY", "")).split(",") if k.strip()]
            if not groq_keys: groq_keys = [""]
            
            for key in groq_keys:
                try:
                    client = Groq(api_key=key)
                    msgs = [{"role": "system", "content": system_msg}] + [
                        {"role": m["role"], "content": m["parts"][0]} for m in chat_history[-3:]
                    ]
                    comp = client.chat.completions.create(messages=msgs, model="llama-3.1-8b-instant")
                    ai_response = comp.choices[0].message.content
                    break
                except Exception:
                    continue
                    
            response = ai_response if ai_response else "¡Hola! ¿En qué te puedo ayudar? 💕"

    except Exception as e:
        print(f"❌ Agent error: {e}")
        response = (
            "Disculpá, tuve un problema procesando tu mensaje. 😔\n"
            "Podés intentar de nuevo o escribirnos por WhatsApp al "
            "*+54 11 5555-4444*. ¡Te ayudamos encantadas! 💕"
        )

    # Add bot response to history
    chat_history.append({"role": "model", "parts": [response]})

    # Keep history manageable
    if len(chat_history) > 20:
        chat_history[:] = chat_history[-20:]

    return response
