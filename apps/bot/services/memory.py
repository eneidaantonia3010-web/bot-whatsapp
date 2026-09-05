# ============================================
# Glow Studio by Sofia — Customer Semantic Memory Service
# ============================================

import json
import logging
from typing import Optional
from .database import get_customer_preferences, update_customer_preferences, get_customer_history

logger = logging.getLogger("glow_bot.memory")


from collections import Counter
from datetime import datetime


def build_structured_customer_profile(phone: str) -> dict:
    """Extract full structured customer profile based on appointment history and stored preferences."""
    if not phone:
        return {
            "preferences": {},
            "favorite_services": [],
            "favorite_categories": [],
            "total_visits": 0,
            "last_visit_date": None,
            "last_service_name": None,
            "preferred_time": None,
            "loyalty_tier": "Cliente Nueva",
        }

    prefs = get_customer_preferences(phone) or {}
    history = get_customer_history(phone) or []

    past_services = [h.get("service_name") for h in history if h.get("service_name")]
    past_categories = [h.get("category") for h in history if h.get("category")]

    service_counts = Counter(past_services).most_common(3)
    category_counts = Counter(past_categories).most_common(2)

    favorite_services = [s[0] for s in service_counts]
    favorite_categories = [c[0] for c in category_counts]

    total_visits = len(history)
    if total_visits >= 3:
        loyalty_tier = "Cliente Frecuente"
    elif total_visits >= 1:
        loyalty_tier = "Cliente Recurrente"
    else:
        loyalty_tier = "Cliente Nueva"

    last_visit_date = None
    last_service_name = None
    if history:
        first_entry = history[0]
        last_visit_date = str(first_entry.get("date")) if first_entry.get("date") else None
        last_service_name = first_entry.get("service_name")

    # Determine preferred time from prefs or history timestamps
    preferred_time = prefs.get("preferred_time")
    if not preferred_time and history:
        morning_count = 0
        afternoon_count = 0
        for h in history:
            h_date = h.get("date")
            if isinstance(h_date, datetime):
                if h_date.hour < 13:
                    morning_count += 1
                else:
                    afternoon_count += 1
        if morning_count > afternoon_count:
            preferred_time = "Mañana (9:00 - 13:00)"
        elif afternoon_count > 0:
            preferred_time = "Tarde (14:00 - 19:00)"

    return {
        "preferences": prefs,
        "favorite_services": favorite_services,
        "favorite_categories": favorite_categories,
        "total_visits": total_visits,
        "last_visit_date": last_visit_date,
        "last_service_name": last_service_name,
        "preferred_time": preferred_time,
        "loyalty_tier": loyalty_tier,
    }


def get_customer_semantic_profile(phone: str) -> dict:
    """Retrieve customer memory profile (wrapper around structured profile)."""
    profile = build_structured_customer_profile(phone)
    return {
        "preferences": profile.get("preferences", {}),
        "past_services": profile.get("favorite_services", []),
        "total_visits": profile.get("total_visits", 0),
        "last_visit": profile.get("last_visit_date"),
        "loyalty_tier": profile.get("loyalty_tier"),
    }


def format_memory_system_context(phone: str) -> str:
    """Format structured memory context to be injected into the LLM system prompt."""
    if not phone:
        return ""

    profile = build_structured_customer_profile(phone)
    prefs = profile.get("preferences", {})
    fav_services = profile.get("favorite_services", [])
    total_visits = profile.get("total_visits", 0)
    loyalty_tier = profile.get("loyalty_tier", "Cliente Nueva")
    last_service = profile.get("last_service_name")
    preferred_time = profile.get("preferred_time")

    if not prefs and not fav_services and total_visits == 0:
        return ""

    parts = [f"Nivel: {loyalty_tier} ({total_visits} visitas previas)."]
    if fav_services:
        parts.append(f"Servicios favoritos habituales: {', '.join(fav_services)}.")
    if last_service:
        parts.append(f"Último servicio atendido: {last_service}.")
    if preferred_time:
        parts.append(f"Horario preferido habitual: {preferred_time}.")
    if prefs.get("favorite_style"):
        parts.append(f"Estilo / fórmula de preferencia: {prefs['favorite_style']}.")
    if prefs.get("notes"):
        parts.append(f"Notas del estilista: {prefs['notes']}.")

    return (
        "\n[PERFIL E HISTORIAL DE LA CLIENTA (Usa esto para una atención personalizada, cercana y empática)]:\n"
        + " ".join(parts)
        + "\n"
    )


def remember_preference(phone: str, key: str, value: str):
    """Store or update a specific preference key for a customer."""
    if not phone or not key or not value:
        return
    current_prefs = get_customer_preferences(phone) or {}
    current_prefs[key] = value
    update_customer_preferences(phone, current_prefs)
    logger.info(f"Remembered preference for {phone[-4:]}: {key} = {value}")


def extract_and_remember_preferences(phone: str, message: str):
    """Extract common preferences from customer message and save them."""
    if not phone or not message:
        return
    text = message.lower().strip()

    # Preferred time of day
    if "a la mañana" in text or "temprano" in text:
        remember_preference(phone, "preferred_time", "Mañana (9:00 - 13:00)")
    elif "a la tarde" in text or "después de las 14" in text or "despues de las 14" in text:
        remember_preference(phone, "preferred_time", "Tarde (14:00 - 19:00)")

    # Preferred days
    days = ["lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado"]
    for d in days:
        if f"los {d}" in text or f"siempre {d}" in text:
            remember_preference(phone, "preferred_day", d.capitalize())
            break

