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
import re
import pytz
from unittest.mock import patch, AsyncMock

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import conversations, get_conversation, process_message, TZ_AR, _is_valid_customer_name

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


@pytest.mark.anyio
async def test_change_time_intent_in_phone_input_resets_date_and_offers_smart_gaps():
    """
    When user is in phone_input stage and writes "quiero cambiar el horario":
    1. Clears selected_date and selected_time.
    2. Moves stage back to date_selection cleanly.
    3. Actively re-offers the 3 compact Smart Gaps slots.
    """
    sender_id = "5491166496150"
    conv = get_conversation(sender_id)
    conv["stage"] = "phone_input"
    conv["selected_service"] = MOCK_SERVICES[3]  # Esmaltado Semi Pro
    conv["selected_date"] = "2026-09-12"
    conv["selected_time"] = "14:00"
    conv["customer_name"] = "Lucia Gomez"

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
         patch("agent.get_smart_availability", new_callable=AsyncMock, return_value=mock_smart_payload), \
         patch("agent.save_conversation_state", return_value=True):

        reply = await process_message(sender_id, "quiero cambiar el horario")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        assert conv["stage"] == "date_selection"
        assert conv["selected_date"] is None
        assert conv["selected_time"] is None
        assert "Cambiamos el horario" in reply or "opciones más recomendadas" in reply
        assert "*14:30hs*" in reply
        assert "*16:00hs*" in reply
        assert "*18:30hs*" in reply


@pytest.mark.anyio
async def test_invalid_customer_name_rejection():
    """
    Validates that sentences with scheduling words, digits or >4 words are rejected.
    """
    assert not _is_valid_customer_name("no quiero para el martes sino para el miercoles 12", MOCK_SERVICES)
    assert not _is_valid_customer_name("quiero cambiar el horario", MOCK_SERVICES)
    assert not _is_valid_customer_name("1166496150", MOCK_SERVICES)
    assert not _is_valid_customer_name("Esmaltado Semi Pro", MOCK_SERVICES)
    assert _is_valid_customer_name("Lucia Gomez", MOCK_SERVICES)
    assert _is_valid_customer_name("Ana Maria Rossi", MOCK_SERVICES)


@pytest.mark.anyio
async def test_name_input_rejects_conversational_sentence():
    """
    In name_input, if the user types a sentence like "quiero saber mas detalles",
    it rejects it and asks politely for their full name without storing it as customer_name.
    If they type a date-changing phrase like "no quiero para el martes sino para el miercoles 12",
    it redirects to date_selection and NEVER stores the phrase as customer_name.
    """
    sender_id = "5491177665544"
    conv = get_conversation(sender_id)
    conv["stage"] = "name_input"
    conv["selected_service"] = MOCK_SERVICES[3]
    conv["selected_date"] = "2026-09-12"
    conv["selected_time"] = "14:00"

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.save_conversation_state", return_value=True):

        # 1. Non-name conversational sentence
        reply = await process_message(sender_id, "quiero saber mas detalles")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        assert conv["stage"] == "name_input"
        assert conv.get("customer_name") != "quiero saber mas detalles"
        assert "nombre completo" in reply.lower()

        # 2. Date-changing phrase during name_input must NOT be saved as name
        reply2 = await process_message(sender_id, "no quiero para el martes sino para el miercoles 12")
        if isinstance(reply2, dict):
            reply2 = reply2.get("response", "")

        assert conv.get("customer_name") != "no quiero para el martes sino para el miercoles 12"
        # Explicit schedule change request cleanly transitions back to date_selection
        await process_message(sender_id, "quiero cambiar el horario")
        assert conv["stage"] == "date_selection"


@pytest.mark.anyio
async def test_strict_name_guardrail_and_interactive_phone_confirmation():
    """
    Validates:
    1. Guardarraíl semántico de nombre propio: descarta frases con conectores de tiempo,
       negaciones, números o verbos, y lanza el mensaje explícito:
       "¡Disculpame! Me mareé un poquito con los días. 😅 ¿Me dirías tu nombre y apellido completo para registrar la reserva? 😊"
    2. Al ingresar un nombre válido, NO asume el teléfono de Baileys automáticamente.
       Lanza la pregunta interactiva obligatoria:
       "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)"
    3. En phone_input, responder "este mismo" o "sí" adopta el número de WhatsApp de sender_id y avanza a confirmation.
    """
    sender_id = "5491178296781"
    conv = get_conversation(sender_id)
    conv["stage"] = "name_input"
    conv["selected_service"] = MOCK_SERVICES[0]
    conv["selected_date"] = "2026-09-15"
    conv["selected_time"] = "16:00"
    conv["customer_name"] = None
    conv["phone_confirmed"] = False

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.save_conversation_state", return_value=True):

        # Paso 1: Enviar frase conversacional con negación y días
        rep1 = await process_message(sender_id, "no quiero para el martes sino para el miercoles a las 12")
        if isinstance(rep1, dict):
            rep1 = rep1.get("response", "")

        assert conv.get("customer_name") is None
        assert "¡Disculpame! Me mareé un poquito con los días. 😅 ¿Me dirías tu nombre y apellido completo para registrar la reserva? 😊" in rep1
        assert conv["stage"] in ("name_input", "name_selection")

        # Paso 2: Enviar nombre propio real
        rep2 = await process_message(sender_id, "Camila Perez")
        if isinstance(rep2, dict):
            rep2 = rep2.get("response", "")

        assert conv["customer_name"] == "Camila Perez"
        assert conv["stage"] == "phone_input"
        assert conv["phone_confirmed"] is False
        assert "Perfecto. ¿Este número de WhatsApp es el que querés dejar para recibir los recordatorios automáticos de tus turnos, o preferís registrar otro número? (Pasámelo con el código de área)" in rep2

        # Paso 3: Confirmar con "este mismo"
        rep3 = await process_message(sender_id, "este mismo")
        if isinstance(rep3, dict):
            rep3 = rep3.get("response", "")

        assert conv["phone_confirmed"] is True
        assert conv["customer_phone"] == "5491178296781"
        assert conv["stage"] == "confirmation"
        assert "Resumen de tu turno:" in rep3
        assert "Camila Perez" in rep3
        assert "5491178296781" in rep3


@pytest.mark.anyio
async def test_phone_input_allows_different_number():
    """
    In phone_input, if the user specifies a different phone number,
    the bot registers that number and advances to confirmation.
    """
    sender_id = "5491178296781"
    conv = get_conversation(sender_id)
    conv["stage"] = "phone_input"
    conv["selected_service"] = MOCK_SERVICES[1]
    conv["selected_date"] = "2026-09-16"
    conv["selected_time"] = "11:00"
    conv["customer_name"] = "Mariana Rossi"
    conv["phone_confirmed"] = False

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.save_conversation_state", return_value=True):

        rep = await process_message(sender_id, "1166496150")
        if isinstance(rep, dict):
            rep = rep.get("response", "")

        assert conv["phone_confirmed"] is True
        assert conv["customer_phone"] == "5491166496150"
        assert conv["stage"] == "confirmation"
        assert "Mariana Rossi" in rep
        assert "5491166496150" in rep


@pytest.mark.anyio
async def test_confirmation_sanitizes_corrupt_date_and_recovers_gracefully():
    """
    In confirmation stage, if selected_date is corrupt or missing,
    the bot recovers from previous user messages or gracefully reoffers slots via Smart Gaps
    instead of crashing or throwing an error.
    """
    sender_id = "5491188776655"
    conv = get_conversation(sender_id)
    conv["stage"] = "confirmation"
    conv["selected_service"] = MOCK_SERVICES[3]
    conv["selected_date"] = "invalid-date-string"
    conv["selected_time"] = "invalid-time"
    conv["customer_name"] = "no quiero para el martes sino para el miercoles 12"  # Corrupt name
    conv["customer_phone"] = "5491166496150"
    conv["chat_history"] = [
        {"role": "user", "parts": ["el viernes a las 15hs"]},
        {"role": "model", "parts": ["¿Confirmamos el turno? Respondé SÍ para confirmar"]}
    ]

    with patch("agent.get_services", return_value=MOCK_SERVICES), \
         patch("agent.create_appointment_via_api", new_callable=AsyncMock) as mock_create, \
         patch("agent.save_conversation_state", return_value=True):

        mock_create.return_value = {"id": "apt_recovered_1", "conflict": False}

        reply = await process_message(sender_id, "sí")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        # Verify create_appointment_via_api was called with sanitized date and name
        assert mock_create.called
        call_kwargs = mock_create.call_args.kwargs
        assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$", call_kwargs["date"])
        assert call_kwargs["customer_name"] != "no quiero para el martes sino para el miercoles 12"
        assert "Turno confirmado" in reply
