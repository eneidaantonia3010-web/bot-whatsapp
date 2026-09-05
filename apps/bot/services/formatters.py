# ============================================
# Glow Studio by Sofia — Formatting Utilities
# ============================================

import logging
from datetime import datetime
import pytz

logger = logging.getLogger("glow_bot.formatters")
TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")


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
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        month_names = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
        ]
        return f"{day_names[dt.weekday()]} {dt.day} de {month_names[dt.month - 1]}"
    except Exception:
        return date_str


def _format_price(price: int | float) -> str:
    """Format integer price into Argentine Pesos representation ($25.000)."""
    try:
        return f"${int(price):,}".replace(",", ".")
    except Exception:
        return f"${price}"


def _is_close_confirmation_answer(text: str) -> bool | None:
    """Classify user response to a confirmation prompt (yes / no / ambiguous)."""
    t_clean = text.lower().strip()
    if any(w in t_clean for w in ("sí", "si", "yes", "confirmo", "dale", "de una", "agendame", "perfecto", "reservar")):
        return True
    if any(w in t_clean for w in ("no", "nope", "nah", "cancelar", "cambiar", "no quiero")):
        return False
    return None


def _apply_output_guardrails(response_text: str) -> str:
    """Verify output consistency: ensure Sunday is never offered as open."""
    lower = response_text.lower()
    if "domingo" in lower and any(w in lower for w in ("abierto", "abrimos", "atendemos", "te esperamos el domingo")):
        response_text += "\n\n*(Recordá que los domingos el salón permanece cerrado; abrimos de Lunes a Sábado de 9:00 a 19:00hs)* ✨"
    return response_text
