# ============================================
# Glow Studio by Sofia — Admin WhatsApp Commands Service
# Secure command handling for salon owners (/balance, /turnos, /bloquear)
# ============================================

import os
import re
import logging
from datetime import datetime, date, timedelta
from typing import Optional
import httpx
import pytz

try:
    from config import ADMIN_PHONE, SALON_WHATSAPP, API_URL, API_SECRET_KEY
except ImportError:
    ADMIN_PHONE = os.getenv("ADMIN_PHONE", "5491178296781")
    SALON_WHATSAPP = os.getenv("SALON_WHATSAPP", "5491178296781")
    API_URL = os.getenv("API_URL", "http://localhost:3001")
    API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")

from services.phone_utils import normalize_phone

logger = logging.getLogger("glow_bot.admin_commands")
TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")


def is_admin_sender(sender_id: str) -> bool:
    """Validate whether the sender phone belongs to the salon administrator."""
    if not sender_id:
        return False

    clean_sender = "".join(c for c in sender_id.split("@")[0] if c.isdigit())
    if not clean_sender:
        return False

    admin_targets = [
        "".join(c for c in ADMIN_PHONE if c.isdigit()),
        "".join(c for c in SALON_WHATSAPP if c.isdigit()),
    ]

    for target in admin_targets:
        if not target:
            continue
        # Check full match or last 8 digits match
        if clean_sender == target:
            return True
        if len(clean_sender) >= 8 and len(target) >= 8 and clean_sender[-8:] == target[-8:]:
            return True

    return False


def _get_api_headers() -> dict:
    return {
        "Content-Type": "application/json",
        "x-api-key": API_SECRET_KEY,
    }


async def _handle_turnos_command(arg: str = "") -> str:
    """Fetch and format appointments list for a specific date (defaults to today)."""
    now = datetime.now(TZ_AR)
    target_date = now.date()

    cleaned_arg = arg.strip().lower()
    if cleaned_arg in ("mañana", "manana"):
        target_date = now.date() + timedelta(days=1)
    elif cleaned_arg and re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned_arg):
        try:
            target_date = datetime.strptime(cleaned_arg, "%Y-%m-%d").date()
        except ValueError:
            pass

    date_str = target_date.strftime("%Y-%m-%d")
    date_display = target_date.strftime("%d/%m/%Y")

    url = f"{API_URL}/api/appointments?date={date_str}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=_get_api_headers())
            if resp.status_code != 200:
                return f"⚠️ Error al consultar la agenda del {date_display} (HTTP {resp.status_code})."

            appointments = resp.json()
            if not appointments:
                return f"📅 *Agenda para el {date_display}:*\n\n_No hay turnos registrados para esta fecha._ ✨"

            lines = [f"📅 *Agenda para el {date_display}* ({len(appointments)} turnos):\n"]
            for idx, apt in enumerate(appointments, 1):
                apt_date = apt.get("date", "")
                time_str = "??:??"
                if apt_date:
                    try:
                        parsed = datetime.fromisoformat(apt_date.replace("Z", "+00:00")).astimezone(TZ_AR)
                        time_str = parsed.strftime("%H:%M")
                    except Exception:
                        time_str = apt_date[11:16] if len(apt_date) >= 16 else apt_date

                cust = apt.get("customer") or {}
                cust_name = cust.get("name", "Cliente")
                cust_phone = cust.get("phone", "S/N")
                service = apt.get("service") or {}
                srv_name = service.get("name", "Servicio")
                status = apt.get("status", "PENDING")

                status_emoji = "✅" if status == "CONFIRMED" else "⏳" if status == "PENDING" else "✔️" if status == "COMPLETED" else "❌"

                lines.append(
                    f"{idx}. ⏰ *{time_str}hs* — 💇 *{srv_name}*\n"
                    f"   👤 {cust_name} (📞 {cust_phone})\n"
                    f"   {status_emoji} Estado: *{status}*\n"
                )

            return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error executing /turnos command: {e}")
        return f"⚠️ Error al comunicarse con la API de turnos: {e}"


async def _handle_balance_command() -> str:
    """Generate daily financial and operational balance report."""
    now = datetime.now(TZ_AR)
    date_str = now.strftime("%Y-%m-%d")
    date_display = now.strftime("%d/%m/%Y")

    url = f"{API_URL}/api/appointments?date={date_str}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=_get_api_headers())
            if resp.status_code != 200:
                return f"⚠️ Error al consultar las estadísticas de hoy (HTTP {resp.status_code})."

            appointments = resp.json()
            total_count = len(appointments)
            completed_count = 0
            completed_revenue = 0
            pending_count = 0
            pending_revenue = 0
            cancelled_count = 0

            for apt in appointments:
                st = apt.get("status")
                price = float(apt.get("service", {}).get("price") or 0)
                if st == "COMPLETED":
                    completed_count += 1
                    completed_revenue += price
                elif st in ("PENDING", "CONFIRMED"):
                    pending_count += 1
                    pending_revenue += price
                elif st == "CANCELLED":
                    cancelled_count += 1

            total_est = completed_revenue + pending_revenue

            return (
                f"📊 *Balance Diario — Glow Studio*\n"
                f"📅 Fecha: *{date_display}*\n\n"
                f"• ✅ *Atendidos/Completados:* {completed_count} turnos (${int(completed_revenue):,} ARS)\n"
                f"• ⏳ *Por atender / Confirmados:* {pending_count} turnos (${int(pending_revenue):,} ARS)\n"
                f"• ❌ *Cancelados:* {cancelled_count} turnos\n"
                f"• 📋 *Total agendados:* {total_count} turnos\n\n"
                f"💰 *Facturación Estimada Total:* *${int(total_est):,} ARS* ✨"
            )
    except Exception as e:
        logger.error(f"Error executing /balance command: {e}")
        return f"⚠️ Error al calcular el balance: {e}"


async def _handle_bloquear_command(args: list[str]) -> str:
    """
    Block a time slot in the salon calendar.
    Syntax: /bloquear <YYYY-MM-DD> <HH:MM> <HH:MM> [motivo]
    """
    if len(args) < 3:
        return (
            "⚠️ *Sintaxis incorrecta para bloquear:*\n"
            "👉 ` /bloquear <fecha: YYYY-MM-DD> <inicio: HH:MM> <fin: HH:MM> [motivo]`\n\n"
            "Ejemplo: `/bloquear 2026-09-08 14:00 16:00 Capacitación de color`"
        )

    date_part = args[0].strip()
    start_time_part = args[1].strip()
    end_time_part = args[2].strip()
    reason = " ".join(args[3:]).strip() if len(args) > 3 else "Bloqueo administrativo"

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_part):
        return f"⚠️ Fecha inválida: `{date_part}`. Formato requerido: `YYYY-MM-DD` (ej. 2026-09-08)."

    if not re.match(r"^\d{1,2}:\d{2}$", start_time_part) or not re.match(r"^\d{1,2}:\d{2}$", end_time_part):
        return f"⚠️ Horarios inválidos: `{start_time_part}` o `{end_time_part}`. Formato requerido: `HH:MM` (ej. 14:00)."

    try:
        start_iso = f"{date_part}T{start_time_part.zfill(5)}:00.000Z"
        end_iso = f"{date_part}T{end_time_part.zfill(5)}:00.000Z"

        url = f"{API_URL}/api/blocked-times"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers=_get_api_headers(),
                json={
                    "startDate": start_iso,
                    "endDate": end_iso,
                    "reason": reason,
                    "allDay": False,
                },
            )

            if resp.status_code in (200, 201):
                return (
                    f"🔒 *Horario Bloqueado con Éxito*\n\n"
                    f"📅 *Fecha:* {date_part}\n"
                    f"⏰ *Horario:* {start_time_part} a {end_time_part}hs\n"
                    f"📝 *Motivo:* {reason}\n\n"
                    f"✨ Las clientas no podrán reservar durante ese lapso."
                )
            else:
                return f"⚠️ No se pudo registrar el bloqueo (HTTP {resp.status_code}): {resp.text}"
    except Exception as e:
        logger.error(f"Error executing /bloquear command: {e}")
        return f"⚠️ Error de conexión al bloquear horario: {e}"


def _handle_help_command() -> str:
    """Return menu of available admin commands."""
    return (
        "👑 *Panel de Control por WhatsApp — Glow Studio*\n\n"
        "Comandos disponibles para la administración del salón:\n\n"
        "• */turnos* [hoy|mañana|YYYY-MM-DD] — Ver lista de turnos y clientes agendados.\n"
        "• */balance* — Reporte financiero, cantidad de turnos y facturación estimada de hoy.\n"
        "• */bloquear <fecha> <inicio> <fin> [motivo]* — Bloquear rango horario en la agenda.\n"
        "• */ayuda* — Mostrar este menú de asistencia.\n\n"
        "_💡 Podés escribir cualquiera de estos comandos en este chat._"
    )


async def handle_admin_command(sender_id: str, command_text: str) -> Optional[str]:
    """
    Main entry point for admin commands.
    Returns response text if command was processed, or None if not an admin or not a command.
    """
    if not is_admin_sender(sender_id):
        return None

    cleaned = command_text.strip()
    if not cleaned.startswith("/"):
        return None

    parts = cleaned.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ("/ayuda", "/help", "/comandos", "/admin"):
        return _handle_help_command()
    elif cmd in ("/turnos", "/agenda"):
        arg = args[0] if args else "hoy"
        return await _handle_turnos_command(arg)
    elif cmd in ("/balance", "/metricas", "/caja"):
        return await _handle_balance_command()
    elif cmd in ("/bloquear", "/block"):
        return await _handle_bloquear_command(args)
    else:
        return f"Comando `{cmd}` no reconocido. Escribí */ayuda* para ver los comandos disponibles."
