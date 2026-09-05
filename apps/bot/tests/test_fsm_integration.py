# -*- coding: utf-8 -*-
# ============================================
# Bot FSM Conversational Integration Test Suite
# ============================================

import os
import sys
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import (
    conversations,
    get_conversation,
    process_message,
    format_services_catalog,
)
from services.language_detector import detect_language


@pytest.fixture(autouse=True)
def clean_conversations():
    """Ensure in-memory conversations are isolated per test."""
    conversations.clear()
    yield
    conversations.clear()


# ── 1. FSM Initial State and Transitions ───────────────────

def test_fsm_initial_state():
    """Verify that a brand new conversation initializes in 'greeting' stage."""
    with patch("agent.get_conversation_state", return_value=None):
        conv = get_conversation("user_test_001")
        assert conv["stage"] == "greeting"
        assert conv["selected_service"] is None
        assert conv["selected_services"] == []
        assert conv["customer_name"] is None
        assert conv["language"] == "es"
        assert conv["fallback_count"] == 0


def test_fsm_state_persistence():
    """Verify that conversation state is retained across calls for same sender with state store."""
    state_db = {}

    def mock_get(sender_id):
        return state_db.get(sender_id)

    def mock_save(sender_id, state):
        state_db[sender_id] = state

    with patch("agent.get_conversation_state", side_effect=mock_get), \
         patch("agent.save_conversation_state", side_effect=mock_save):

        conv1 = get_conversation("user_test_002")
        conv1["stage"] = "service_selection"
        conv1["selected_service"] = {"name": "Balayage VIP", "price": 45000}
        mock_save("user_test_002", conv1)

        conv2 = get_conversation("user_test_002")
        assert conv2["stage"] == "service_selection"
        assert conv2["selected_service"]["name"] == "Balayage VIP"


def test_fsm_format_services_catalog():
    """Test catalog formatting for service_selection stage."""
    services = [
        {"name": "Balayage VIP", "price": 45000, "duration": 120, "description": "Tratamiento completo", "category": "cabello"},
        {"name": "Esmaltado Semipermanente", "price": 12000, "duration": 60, "description": "Uñas perfectas", "category": "unas"},
    ]
    catalog = format_services_catalog(services)
    assert "Balayage VIP" in catalog
    assert "45.000" in catalog
    assert "Esmaltado Semipermanente" in catalog


# ── 2. Multi-Turn Conversational Booking Flow (End-to-End) ─

@pytest.mark.anyio
async def test_fsm_full_booking_conversation_flow():
    """
    Simulates a multi-turn conversation from greeting through name/phone input:
    Turn 1: User greets -> Bot responds and initializes conversation
    Turn 2: Service Selection stage advance
    Turn 3: Date & Time Selection advance
    Turn 4: Name input -> Transitions to phone_input or confirmation
    """
    sender_id = "5491199998888"
    mock_service = {"id": "srv-1", "name": "Corte y Peinado Glow", "price": 15000, "duration": 60, "category": "cabello"}
    mock_services_list = [mock_service]
    state_db = {}

    def mock_get(s_id):
        return state_db.get(s_id)

    def mock_save(s_id, state):
        state_db[s_id] = state

    with patch("agent.get_conversation_state", side_effect=mock_get), \
         patch("agent.save_conversation_state", side_effect=mock_save), \
         patch("agent.get_services", return_value=mock_services_list), \
         patch("agent.get_service_by_index", return_value=mock_service), \
         patch("agent.get_service_by_name", return_value=mock_service), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.create_appointment_via_api", return_value={"id": "apt-123", "status": "CONFIRMED"}), \
         patch("agent.llm_pool.get_completion", return_value='{"servicio": null, "fecha": null}'), \
         patch("agent.llm_pool.get_completion_async", new_callable=AsyncMock) as mock_llm:

        mock_llm.return_value = "¡Hola! Bienvenida a Glow Studio Sofia. ¿En qué servicio te gustaría reservar hoy?"

        # Turn 1: Greeting
        res1 = await process_message(sender_id, "Hola, buenas tardes")
        assert res1 is not None

        # Turn 2: Service Selection state advance
        conv = get_conversation(sender_id)
        conv["stage"] = "date_selection"
        conv["selected_service"] = mock_service
        mock_save(sender_id, conv)

        # Turn 3: Date & Time Selection (Simulate user picking a slot)
        conv["selected_date"] = "2026-09-12"
        conv["selected_time"] = "15:00"
        conv["stage"] = "name_input"
        mock_save(sender_id, conv)

        # Turn 4: Name input
        mock_llm.return_value = "Gracias Florencia. ¿Cuál es tu número de teléfono para confirmar?"
        res4 = await process_message(sender_id, "Florencia Perez")
        assert res4 is not None

        conv_final = get_conversation(sender_id)
        assert conv_final["customer_name"] is not None
        assert conv_final["stage"] in ("name_input", "phone_input", "confirmation")


# ── 3. Cancellation & Reschedule FSM Branches ──────────────

@pytest.mark.anyio
async def test_fsm_cancellation_flow():
    """Test cancellation confirmation stage."""
    sender_id = "5491188887777"
    state_db = {}

    def mock_get(s_id):
        return state_db.get(s_id)

    def mock_save(s_id, state):
        state_db[s_id] = state

    with patch("agent.get_conversation_state", side_effect=mock_get), \
         patch("agent.save_conversation_state", side_effect=mock_save), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.cancel_appointment", return_value=True), \
         patch("agent.llm_pool.get_completion", return_value=""), \
         patch("agent.llm_pool.get_completion_async", new_callable=AsyncMock) as mock_llm:

        mock_llm.return_value = "Tu turno fue cancelado correctamente."

        conv = get_conversation(sender_id)
        conv["stage"] = "confirm_cancellation"
        conv["cancelling_apt"] = {"id": "apt-cancel-1", "service": "Corte", "date": "2026-09-15", "time": "14:00"}
        mock_save(sender_id, conv)

        # User confirms cancellation
        res = await process_message(sender_id, "Sí, confirmo la cancelación")
        assert res is not None


# ── 4. Language Switching within FSM ───────────────────────

@pytest.mark.anyio
async def test_fsm_dynamic_language_switch():
    """Verify that FSM detects language changes across conversation turns."""
    sender_id = "5491177776666"
    state_db = {}

    def mock_get(s_id):
        return state_db.get(s_id)

    def mock_save(s_id, state):
        state_db[s_id] = state

    with patch("agent.get_conversation_state", side_effect=mock_get), \
         patch("agent.save_conversation_state", side_effect=mock_save), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.llm_pool.get_completion", return_value=""), \
         patch("agent.llm_pool.get_completion_async", new_callable=AsyncMock) as mock_llm:

        mock_llm.return_value = "Olá! Como posso ajudar você hoje?"

        conv = get_conversation(sender_id)
        assert conv["language"] == "es"
        mock_save(sender_id, conv)

        # User speaks in Portuguese
        await process_message(sender_id, "Olá, gostaria de agendar um horário para fazer as unhas por favor")
        conv_updated = get_conversation(sender_id)
        assert conv_updated["language"] == "pt"
