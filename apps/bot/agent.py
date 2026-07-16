# ============================================
# Glow Studio by Sofia — Gemini AI Agent
# ============================================

import os
import json
import re
from datetime import datetime, timedelta
from typing import Optional

import google.generativeai as genai

from services.database import get_services, get_service_by_name, get_service_by_index
from services.calendar import create_appointment_via_api, get_availability
from services.whatsapp import send_whatsapp_notification


# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction="""Sos el asistente virtual de Glow Studio by Sofia, un salón de belleza premium en Buenos Aires (Av. Corrientes 1234).

PERSONALIDAD:
- Cálida, profesional y empática
- Usás emojis sutiles (✨💇‍♀️💅🧖‍♀️💕📅)
- Tratás de "vos" (español argentino)
- Sos vendedora pero no agresiva
- Si no entendés algo, derivás a humano

INFORMACIÓN DEL SALÓN:
- Nombre: Glow Studio by Sofia
- Dirección: Av. Corrientes 1234, Buenos Aires
- Horarios: Lunes a Sábado de 9:00 a 19:00. Domingos cerrado.
- WhatsApp: +54 11 5555-4444

FLUJO DE RESERVA:
1. Saludás y ofrecés el catálogo de servicios
2. El cliente elige un servicio (por nombre o número)
3. Preguntás qué día y horario prefiere
4. Preguntás el nombre completo
5. Preguntás el teléfono/WhatsApp
6. Confirmás todos los datos y reservás

REGLAS:
- Siempre mostrá precios en formato $XX.000
- Siempre mencioná la duración del servicio
- Si te preguntan por algo que no es del salón, redirigí amablemente
- Si el cliente parece frustrado, ofrecé hablar con una persona: "Podés escribirnos por WhatsApp al +54 11 5555-4444 y te atendemos personalmente 💕"
- Respondé SIEMPRE en español argentino""",
)

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
                    mins = duration_min % 60
                    duration = f"{hours}h" + (f" {mins}min" if mins else "")
                else:
                    duration = f"{duration_min}min"

                response = (
                    f"¡Excelente elección! ✨ *{service['name']}* — {price} ({duration})\n\n"
                    f"Para agilizar tu reserva, por favor decime **en un solo mensaje**:\n"
                    f"📅 Día y horario (Ej: viernes a las 15hs)\n"
                    f"👤 Tu nombre completo\n"
                    f"📱 Tu número de teléfono o WhatsApp"
                )
                conv["stage"] = "details_input"
            else:
                # Use Gemini to understand what they want
                chat = model.start_chat(history=chat_history[:-1])
                ai_response = chat.send_message(
                    f"El cliente escribió: '{message}'. "
                    f"No pude identificar un servicio. Respondé amablemente, "
                    f"mostrá el catálogo de nuevo si es necesario. "
                    f"Servicios: 1.Corte Signature $25.000, 2.Corte Hombre $15.000, "
                    f"3.Uñas Gel $28.000, 4.Esmaltado Semi $18.000, "
                    f"5.Facial Glow $35.000, 6.Keratina $45.000"
                )
                response = ai_response.text

        elif stage == "details_input":
            # Use Gemini to extract date, time, name, and phone
            today_str = datetime.now().strftime("%Y-%m-%d")
            prompt = (
                f"Extrae la fecha, hora, nombre y teléfono del siguiente mensaje del cliente: '{message}'.\n"
                f"Hoy es {today_str}. Interpreta referencias como 'mañana', 'el viernes', etc., en base a hoy.\n"
                f"Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta y claves en inglés:\n"
                f"{{\n"
                f"  \"date\": \"YYYY-MM-DD\" (o null si no se entiende),\n"
                f"  \"time\": \"HH:MM\" (en formato 24h, o null),\n"
                f"  \"name\": \"Nombre del cliente\" (o null),\n"
                f"  \"phone\": \"Número de teléfono\" (o null)\n"
                f"}}"
            )
            chat = model.start_chat()
            try:
                ai_response = chat.send_message(
                    prompt, 
                    generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
                )
                # Limpiar backticks de markdown por si Gemini los devuelve
                raw_text = ai_response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("\n", 1)[-1]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
                
                data = json.loads(raw_text)
                
                # Check if all fields are present
                missing = []
                if not data.get("date") or not data.get("time"):
                    missing.append("qué día y horario te queda mejor")
                if not data.get("name"):
                    missing.append("tu nombre completo")
                if not data.get("phone") or len(str(data.get("phone"))) < 6:
                    missing.append("un número de teléfono válido")
                
                if missing:
                    missing_text = " y ".join(missing)
                    response = f"Me faltó un detallito. ¿Me podrías decir {missing_text}? 😊"
                else:
                    conv["selected_date"] = data["date"]
                    conv["selected_time"] = data["time"]
                    conv["customer_name"] = data["name"]
                    conv["customer_phone"] = str(data["phone"])
                    
                    service = conv["selected_service"]
                    date_obj = datetime.strptime(data["date"], "%Y-%m-%d")
                    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
                    month_names = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                                   "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
                    display_date = f"{day_names[date_obj.weekday()]} {date_obj.day} de {month_names[date_obj.month - 1]}"
                    price = f"${service['price']:,}".replace(",", ".")

                    response = (
                        f"✨ *Resumen de tu turno:*\n\n"
                        f"💇 Servicio: *{service['name']}*\n"
                        f"💰 Precio: {price}\n"
                        f"📅 Fecha: *{display_date} a las {data['time']}hs*\n"
                        f"👤 Nombre: *{data['name']}*\n"
                        f"📱 Teléfono: *{data['phone']}*\n\n"
                        f"¿Confirmamos? Escribí *sí* para reservar 💕"
                    )
                    conv["stage"] = "confirmation"
            except Exception as e:
                error_msg = str(e).lower()
                print(f"❌ Error in details_input: {e}")
                if "429" in error_msg or "quota" in error_msg:
                    response = "¡Ups! Me estoy quedando sin energía por un ratito por exceso de mensajes rápidos. 🥺 Por favor, intentá escribirme de nuevo en unos segunditos."
                else:
                    response = "No logré entender todos los datos. Por favor, decime tu día, hora, nombre y teléfono de nuevo de forma clara 😊"

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
            # Fallback to Gemini for any other stage
            chat = model.start_chat(history=chat_history[:-1])
            ai_response = chat.send_message(message)
            response = ai_response.text

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
