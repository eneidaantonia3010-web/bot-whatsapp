# -*- coding: utf-8 -*-
# ============================================
# Glow Studio by Sofia — Analytical Continuity & Smart Gaps Test Suite
# Tests for:
# 1. Option number matching pending continuity service
# 2. Affirmative reply ("sí", "dale") resuming pending service
# 3. Seamless transition to Smart Gaps without triggering cron reminder module
# 4. Clean switching when a different option or "no" is chosen
# ============================================

import os
import sys
import pytest
from datetime import datetime
import pytz
from unittest.mock import patch, AsyncMock

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import conversations, get_conversation, process_message, TZ_AR

MOCK_SERVICES = [
    {"id": "srv-1", "name": "Corte Signature", "price": 25000, "duration": 45, "category": "cabello"},
    {"id": "srv-2", "name": "Corte Hombre Premium", "price": 15000, "duration": 30, "category": "cabello"},
    {"id": "srv-3", "name": "Uñas Gel Luxury", "price": 28000, "duration": 75, "category": "unas"},
    {"id": "srv-4", "name": "Esmaltado Semi Pro", "price": 18000, "duration": 45, "category": "unas"},
    {"id": "srv-5", "name": "Facial Glow", "price": 35000, "duration": 60, "category": "facial"},
    {"id": "srv-6", "name": "Tratamiento Anti-frizz Keratina", "price": 45000, "duration": 120, "category": "tratamientos"},
]


@pytest.fixture(autouse=True)
def clean_conversations():
    """Ensure in-memory conversations are isolated per test."""
    conversations.clear()
    yield
    conversations.clear()


@pytest.mark.anyio
async def test_continuity_option_number_resumes_pending_service_with_smart_gaps():
    """
    When the bot asks contextual welcome back "¿Seguimos?" with pending Esmaltado Semi Pro,
    and user replies with option number "4":
    1. Interpreted semantically as "SÍ, quiero continuar".
    2. Does NOT trigger upcoming appointment confirmation (cron module).
    3. Retains Esmaltado Semi Pro as selected service.
    4. Advances to date_selection and presents 3 Smart Gaps slots.
    """
    sender_id = "5491199887766"
    conv = get_conversation(sender_id)
    conv["stage"] = "service_selection"
    conv["selected_service"] = MOCK_SERVICES[3]  # Esmaltado Semi Pro (option 4)
    conv["pending_continuity_service"] = MOCK_SERVICES[3]
    conv["awaiting_continuity"] = True
    conv["chat_history"] = [
        {"role": "model", "parts": ["¡Hola de nuevo! 💕 Habíamos quedado con tu turno de *Esmaltado Semi Pro*. ¿Seguimos? 😊"]}
    ]

    mock_smart_payload = {
        "date": "2026-09-09",
        "serviceId": "srv-4",
        "recommendedSlots": [
            {"time": "14:30", "score": 100},
            {"time": "16:00", "score": 90},
            {"time": "18:30", "score": 85},
        ],
        "slots": [],
    }

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.get_service_by_index", side_effect=lambda idx: MOCK_SERVICES[idx - 1] if 1 <= idx <= len(MOCK_SERVICES) else None), \
         patch("agent.get_smart_availability", new_callable=AsyncMock) as mock_smart, \
         patch("agent.confirm_upcoming_appointment", new_callable=AsyncMock) as mock_confirm_cron, \
         patch("agent.save_conversation_state", return_value=True):

        mock_smart.return_value = mock_smart_payload

        reply = await process_message(sender_id, "4")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        # Assertions
        assert mock_confirm_cron.call_count == 0, "Should NOT call cron confirmation module!"
        assert conv["stage"] == "date_selection", f"Expected stage date_selection, got {conv['stage']}"
        assert conv["selected_service"]["name"] == "Esmaltado Semi Pro"
        assert "*14:30hs*" in reply
        assert "*16:00hs*" in reply
        assert "*18:30hs*" in reply
        assert "No encontré un turno pendiente que confirmar" not in reply
        assert sender_id in conversations, "Session must NOT be deleted from active conversations"


@pytest.mark.anyio
async def test_continuity_affirmative_word_resumes_pending_service():
    """
    When the bot asks "¿Seguimos?" with pending Esmaltado Semi Pro and user says "sí",
    it must proceed to date_selection with Smart Gaps slots without triggering cron confirmation.
    """
    sender_id = "5491199887755"
    conv = get_conversation(sender_id)
    conv["stage"] = "service_selection"
    conv["selected_service"] = MOCK_SERVICES[3]
    conv["pending_continuity_service"] = MOCK_SERVICES[3]
    conv["awaiting_continuity"] = True
    conv["chat_history"] = [
        {"role": "model", "parts": ["¡Hola de nuevo! 💕 Habíamos quedado con tu turno de *Esmaltado Semi Pro*. ¿Seguimos? 😊"]}
    ]

    mock_smart_payload = {
        "date": "2026-09-09",
        "serviceId": "srv-4",
        "recommendedSlots": [
            {"time": "15:00", "score": 95},
            {"time": "17:00", "score": 88},
            {"time": "19:00", "score": 80},
        ],
        "slots": [],
    }

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.get_service_by_index", side_effect=lambda idx: MOCK_SERVICES[idx - 1] if 1 <= idx <= len(MOCK_SERVICES) else None), \
         patch("agent.get_smart_availability", new_callable=AsyncMock) as mock_smart, \
         patch("agent.confirm_upcoming_appointment", new_callable=AsyncMock) as mock_confirm_cron, \
         patch("agent.save_conversation_state", return_value=True):

        mock_smart.return_value = mock_smart_payload

        reply = await process_message(sender_id, "sí")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        assert mock_confirm_cron.call_count == 0
        assert conv["stage"] == "date_selection"
        assert conv["selected_service"]["name"] == "Esmaltado Semi Pro"
        assert "*15:00hs*" in reply
        assert "*17:00hs*" in reply
        assert "*19:00hs*" in reply


@pytest.mark.anyio
async def test_continuity_rejection_resets_and_shows_catalog():
    """
    When the bot asks "¿Seguimos?" with pending Esmaltado Semi Pro and user says "no",
    it resets the service selection and presents the full catalog.
    """
    sender_id = "5491199887744"
    conv = get_conversation(sender_id)
    conv["stage"] = "service_selection"
    conv["selected_service"] = MOCK_SERVICES[3]
    conv["pending_continuity_service"] = MOCK_SERVICES[3]
    conv["awaiting_continuity"] = True
    conv["chat_history"] = [
        {"role": "model", "parts": ["¡Hola de nuevo! 💕 Habíamos quedado con tu turno de *Esmaltado Semi Pro*. ¿Seguimos? 😊"]}
    ]

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.save_conversation_state", return_value=True):

        reply = await process_message(sender_id, "no")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        assert conv["stage"] == "service_selection"
        assert conv["selected_service"] is None
        assert conv["awaiting_continuity"] is False
        assert "Corte Signature" in reply


@pytest.mark.anyio
async def test_continuity_different_option_selects_new_service():
    """
    When asked "¿Seguimos?" with pending option 4, but user sends "1",
    it switches cleanly to option 1 (Corte Signature).
    """
    sender_id = "5491199887733"
    conv = get_conversation(sender_id)
    conv["stage"] = "service_selection"
    conv["selected_service"] = MOCK_SERVICES[3]  # Pending was Esmaltado Semi Pro
    conv["pending_continuity_service"] = MOCK_SERVICES[3]
    conv["awaiting_continuity"] = True
    conv["chat_history"] = [
        {"role": "model", "parts": ["¡Hola de nuevo! 💕 Habíamos quedado con tu turno de *Esmaltado Semi Pro*. ¿Seguimos? 😊"]}
    ]

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.get_service_by_index", side_effect=lambda idx: MOCK_SERVICES[idx - 1] if 1 <= idx <= len(MOCK_SERVICES) else None), \
         patch("agent.get_smart_availability", new_callable=AsyncMock, return_value=None), \
         patch("agent.get_availability", new_callable=AsyncMock, return_value=[]), \
         patch("agent.save_conversation_state", return_value=True):

        reply = await process_message(sender_id, "1")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        assert conv["selected_service"]["name"] == "Corte Signature"
        assert conv["stage"] == "date_selection"
        assert "Corte Signature" in reply
