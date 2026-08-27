# ============================================
# Glow Studio by Sofia — Customer Semantic Memory Service
# ============================================

import json
import logging
from typing import Optional
from .database import get_customer_preferences, update_customer_preferences, get_customer_history

logger = logging.getLogger("glow_bot.memory")


def get_customer_semantic_profile(phone: str) -> dict:
    """Retrieve full customer memory profile (past history + stored semantic preferences)."""
    prefs = get_customer_preferences(phone) or {}
    history = get_customer_history(phone) or []
    
    past_services = [h.get("service_name") for h in history if h.get("service_name")]
    
    return {
        "preferences": prefs,
        "past_services": past_services[:5],
        "total_visits": len(history),
        "last_visit": history[0].get("date") if history else None,
    }


def format_memory_system_context(phone: str) -> str:
    """Format memory context to be seamlessly injected into the LLM system prompt."""
    if not phone:
        return ""
    
    profile = get_customer_semantic_profile(phone)
    prefs = profile.get("preferences", {})
    past_services = profile.get("past_services", [])
    
    if not prefs and not past_services:
        return ""
    
    memory_parts = []
    if past_services:
        memory_parts.append(f"Servicios frecuentes anteriores: {', '.join(past_services[:3])}.")
    
    if prefs.get("favorite_style"):
        memory_parts.append(f"Estilo / fórmula favorita: {prefs['favorite_style']}.")
    
    if prefs.get("preferred_time"):
        memory_parts.append(f"Horario habitual preferido: {prefs['preferred_time']}.")
        
    if prefs.get("notes"):
        memory_parts.append(f"Notas del estilista: {prefs['notes']}.")

    if memory_parts:
        return "\n[MEMORIA DE LA CLIENTA (Usa esto para una atención personalizada y cercana)]:\n" + " ".join(memory_parts) + "\n"
    
    return ""


def remember_preference(phone: str, key: str, value: str):
    """Store or update a specific preference key for a customer."""
    if not phone or not key or not value:
        return
    current_prefs = get_customer_preferences(phone) or {}
    current_prefs[key] = value
    update_customer_preferences(phone, current_prefs)
    logger.info(f"Remembered preference for {phone[-4:]}: {key} = {value}")
