# -*- coding: utf-8 -*-
# ============================================
# Conversational AI Intelligence Test Suite
# Tests for Analytical Semantic Router, Dynamic Slot Filling,
# Digression Handling with Contextual Return, and Change of Mind
# ============================================

import os
import sys
import pytest
from datetime import datetime, timedelta
import pytz
from unittest.mock import patch, MagicMock, AsyncMock

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import conversations, get_conversation, process_message
from services.semantic_router import (
    analyze_message_semantics_async,
    build_contextual_return_prompt,
    _extract_semantics_rules,
)

TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")

MOCK_SERVICES = [
    {"id": "srv-1", "name": "Corte Signature", "price": 25000, "duration": 45, "category": "cabello"},
    {"id": "srv-2", "name": "Uñas Gel Luxury", "price": 28000, "duration": 75, "category": "unas"},
    {"id": "srv-3", "name": "Facial Glow", "price": 35000, "duration": 60, "category": "estetica"},
]


@pytest.fixture(autouse=True)
def clean_conversations():
    """Ensure in-memory conversations are isolated per test."""
    conversations.clear()
    yield
    conversations.clear()


# ── 1. Dynamic Multi-Parameter Slot Filling in Greeting ────

@pytest.mark.anyio
async def test_greeting_multi_parameter_slot_filling():
    """
    User provides name, service, and date in their very first message.
    Bot must extract all 3 slots, store name in memory, and jump straight to phone_input.
    """
    sender_id = "5491100010001"
    msg = "Hola, me llamo Valeria Diaz y quiero un turno para corte mañana a las 15hs"

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.get_service_by_name", side_effect=lambda n: next((s for s in MOCK_SERVICES if "corte" in s["name"].lower()), None)), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.remember_preference") as mock_remember:

        reply = await process_message(sender_id, msg)
        conv = get_conversation(sender_id)

        # Verified entity extractions
        assert conv["selected_service"] is not None
        assert "Corte" in conv["selected_service"]["name"]
        assert conv["selected_date"] is not None
        assert conv["selected_time"] == "15:00"
        assert conv["customer_name"] == "Valeria Diaz"

        # Skipped greeting & service_selection straight to phone_input
        assert conv["stage"] == "phone_input"
        assert "teléfono" in reply.lower() or "whatsapp" in reply.lower()
        mock_remember.assert_called()


# ── 2. Multi-Parameter Slot Filling in name_input (Name + Phone)

@pytest.mark.anyio
async def test_name_input_with_phone_jumps_to_confirmation():
    """
    When in name_input, user provides both their name and phone number in the same message.
    Bot must extract both slots and jump straight to confirmation.
    """
    sender_id = "5491100020002"
    conv = get_conversation(sender_id)
    conv["stage"] = "name_input"
    conv["selected_service"] = MOCK_SERVICES[0]
    conv["selected_date"] = "2026-09-12"
    conv["selected_time"] = "15:00"

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.remember_preference") as mock_remember:

        reply = await process_message(sender_id, "Me llamo Camila Gomez y mi numero es 1155443322")

        assert conv["customer_name"] == "Camila Gomez"
        assert conv["customer_phone"] == "5491155443322"
        assert conv["stage"] == "confirmation"
        assert "resumen de tu turno" in reply.lower()
        assert "Camila Gomez" in reply
        assert "5491155443322" in reply


# ── 3. Digression with Contextual Return Bridging (Payments FAQ)

@pytest.mark.anyio
async def test_digression_during_name_input_returns_to_name_prompt():
    """
    While in name_input, customer asks about payment methods.
    Bot answers with payment methods AND, in the same response, guides customer
    back to name_input without leaving or resetting the booking flow.
    """
    sender_id = "5491100030003"
    conv = get_conversation(sender_id)
    conv["stage"] = "name_input"
    conv["selected_service"] = MOCK_SERVICES[0]
    conv["selected_date"] = "2026-09-15"
    conv["selected_time"] = "14:00"

    with patch("agent.get_services", return_value=MOCK_SERVICES):
        reply = await process_message(sender_id, "Che, ¿cuáles son los medios de pago que aceptan?")

        # Bot answered the FAQ
        assert "métodos de pago" in reply.lower() or "efectivo" in reply.lower()
        # Bot gracefully bridged back to name input in the same message
        assert "nombre completo" in reply.lower() or "nombre" in reply.lower()
        # Stage did NOT reset or leave name_input
        assert conv["stage"] == "name_input"


# ── 4. Digression with Contextual Return Bridging (Location FAQ)

@pytest.mark.anyio
async def test_digression_during_date_selection_returns_to_date_prompt():
    """
    While in date_selection, customer asks about location/parking.
    Bot answers with location AND re-guides client to date selection in the same message.
    """
    sender_id = "5491100040004"
    conv = get_conversation(sender_id)
    conv["stage"] = "date_selection"
    conv["selected_service"] = MOCK_SERVICES[0]

    with patch("agent.get_services", return_value=MOCK_SERVICES):
        reply = await process_message(sender_id, "¿Dónde queda el salón y cómo llego?")

        # Bot answered location FAQ
        assert "corrientes 1234" in reply.lower() or "dirección" in reply.lower()
        # Bot gracefully bridged back to date selection
        assert "día y horario" in reply.lower() or "qué día" in reply.lower()
        # Stage remained date_selection
        assert conv["stage"] == "date_selection"


# ── 5. Mid-Process Change of Mind (Service Change in date_selection)

@pytest.mark.anyio
async def test_mid_process_change_of_mind_service():
    """
    In date_selection, user changes mind: 'En realidad prefiero hacerme las uñas'.
    Bot updates selected service to Uñas Gel Luxury and asks for date for new service.
    """
    sender_id = "5491100050005"
    conv = get_conversation(sender_id)
    conv["stage"] = "date_selection"
    conv["selected_service"] = MOCK_SERVICES[0]  # Corte Signature

    def mock_service_by_name(name):
        n = name.lower()
        if "uña" in n or "unas" in n:
            return MOCK_SERVICES[1]
        return MOCK_SERVICES[0]

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.get_service_by_name", side_effect=mock_service_by_name):

        reply = await process_message(sender_id, "En realidad prefiero hacerme las uñas")

        assert conv["selected_service"]["id"] == "srv-2"
        assert "Uñas Gel Luxury" in conv["selected_service"]["name"]
        assert "Uñas Gel Luxury" in reply
        assert "¿para qué día y horario" in reply.lower() or "día y horario" in reply.lower()
        assert conv["stage"] == "date_selection"


# ── 6. Mid-Process Change of Mind (Date Change in name_input) ────

@pytest.mark.anyio
async def test_mid_process_change_of_mind_date():
    """
    In name_input, user changes date: 'Mejor pasame para el viernes a las 16hs'.
    Bot updates the scheduled date/time and prompts again for name.
    """
    sender_id = "5491100060006"
    conv = get_conversation(sender_id)
    conv["stage"] = "name_input"
    conv["selected_service"] = MOCK_SERVICES[0]
    conv["selected_date"] = "2026-09-10"
    conv["selected_time"] = "11:00"

    with patch("agent.get_services", return_value=MOCK_SERVICES):
        reply = await process_message(sender_id, "Mejor pasame para el viernes a las 16hs")

        assert conv["selected_time"] == "16:00"
        assert "16:00hs" in reply or "16hs" in reply
        assert "nombre completo" in reply.lower()
        assert conv["stage"] == "name_input"


# ── 7. Complex End-to-End Dialogue with Digression and Change of Mind

@pytest.mark.anyio
async def test_complex_intelligent_dialogue_flow():
    """
    Turn 1: User asks for haircut -> stage advances to date_selection
    Turn 2: User digresses asking where is the salon -> bot answers location + returns to date_selection
    Turn 3: User changes mind to nails + gives date -> updates service & date, advances to name_input
    Turn 4: User provides name + phone -> bot advances directly to confirmation!
    """
    sender_id = "5491100070007"

    def mock_service_by_name(name):
        n = name.lower()
        if "uña" in n or "unas" in n:
            return MOCK_SERVICES[1]
        return MOCK_SERVICES[0]

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.get_service_by_name", side_effect=mock_service_by_name), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.remember_preference"):

        # Turn 1: Service selection
        r1 = await process_message(sender_id, "Hola, quiero un corte")
        conv = get_conversation(sender_id)
        assert conv["stage"] == "date_selection"

        # Turn 2: Digression (Location FAQ)
        r2 = await process_message(sender_id, "¿Dónde queda el salón?")
        assert "corrientes 1234" in r2.lower()
        assert "qué día y horario" in r2.lower()
        assert conv["stage"] == "date_selection"

        # Turn 3: Change of mind to nails + date in single message
        r3 = await process_message(sender_id, "Mejor haceme las uñas mañana a las 14hs")
        assert "Uñas Gel Luxury" in conv["selected_service"]["name"]
        assert conv["selected_time"] == "14:00"
        assert conv["stage"] == "name_input"

        # Turn 4: Dynamic slot filling for Name + Phone
        r4 = await process_message(sender_id, "Soy Luciana Torres y mi tel es 1133221100")
        assert conv["customer_name"] == "Luciana Torres"
        assert conv["customer_phone"] == "5491133221100"
        assert conv["stage"] == "confirmation"
        assert "resumen de tu turno" in r4.lower()
