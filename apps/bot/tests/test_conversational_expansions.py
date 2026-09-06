# -*- coding: utf-8 -*-
# ============================================
# Conversational Expansions Test Suite (LLaMA 3.1 8B Flows)
# Covers:
# 1. Smart Objection Handling (Waitlist & schedule alternatives)
# 2. Cancellation Policies (< 2h notice policy enforcement)
# 3. Cross-Selling Opportunities (Color affinity + Haircut booking)
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
from services.memory import detect_cross_sell_opportunity

TZ_AR = pytz.timezone("America/Argentina/Buenos_Aires")


@pytest.fixture(autouse=True)
def clean_conversations():
    """Ensure in-memory conversations are isolated per test."""
    conversations.clear()
    yield
    conversations.clear()


# ── 1. Smart Objection Handling Tests ─────────────────────

@pytest.mark.anyio
async def test_schedule_objection_proposes_waitlist():
    """When a user in date_selection objects to schedule, the bot proposes the waitlist."""
    conv = get_conversation("user_obj_01")
    conv["stage"] = "date_selection"
    conv["selected_service"] = {"id": "srv_corte", "name": "Corte Signature", "price": 25000, "duration": 45}

    with patch("agent.classify_intent_with_confidence_async", new_callable=AsyncMock, return_value=("OTHER", 0.85)), \
         patch("agent.llm_pool.get_completion_async", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "¡Entiendo totalmente! 💕 ¿Preferís que te anote en la lista de espera para el sábado por si se libera un espacio?"

        reply = await process_message("user_obj_01", "no me sirve ningún horario, salgo muy tarde de trabajar")

        assert "lista de espera" in reply.lower()
        mock_llm.assert_called_once()
        # Verify it used llama-3.1-8b-instant
        _, kwargs = mock_llm.call_args
        assert kwargs.get("model") == "llama-3.1-8b-instant"


@pytest.mark.anyio
async def test_service_price_objection_proposes_alternatives():
    """When a user in service_selection objects to price or catalog, bot suggests options."""
    conv = get_conversation("user_obj_02")
    conv["stage"] = "service_selection"

    with patch("agent.classify_intent_with_confidence_async", new_callable=AsyncMock, return_value=("OTHER", 0.85)), \
         patch("agent.get_services", return_value=[
             {"id": "s1", "name": "Corte Signature", "price": 25000, "duration": 45, "category": "PELUQUERIA", "active": True}
         ]), \
         patch("agent.llm_pool.get_completion_async", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "Entiendo tu presupuesto 💕 Tenemos opciones accesibles y promociones especiales. ¿Qué resultado te gustaría lograr?"

        reply = await process_message("user_obj_02", "está muy caro, no tienen algo más barato?")

        assert "presupuesto" in reply.lower() or "opciones" in reply.lower()
        mock_llm.assert_called_once()
        _, kwargs = mock_llm.call_args
        assert kwargs.get("model") == "llama-3.1-8b-instant"


# ── 2. Cancellation Policies (< 2 Hours Notice) Tests ─────

@pytest.mark.anyio
async def test_cancellation_within_2_hours_includes_policy_warning():
    """When cancelling an appointment with less than 2 hours notice, warn about salon policy."""
    conv = get_conversation("user_canc_urgent")
    conv["stage"] = "greeting"

    # Appointment 45 minutes in the future
    soon_dt = datetime.now(TZ_AR) + timedelta(minutes=45)
    mock_apt = {
        "id": "apt_urgent_1",
        "date": soon_dt.isoformat(),
        "service": {"name": "Corte y Peinado"},
        "status": "CONFIRMED",
    }

    with patch("agent.get_upcoming_appointments", new_callable=AsyncMock, return_value=[mock_apt]):
        reply = await process_message("user_canc_urgent", "quiero cancelar mi turno")

        # Must display appointment and warn about 2 hours policy
        assert "2 horas" in reply
        assert "confirmás que querés cancelarlo" in reply.lower() or "confirmas que queres cancelarlo" in reply.lower()
        assert conv["stage"] == "confirm_cancellation"


@pytest.mark.anyio
async def test_cancellation_far_in_advance_normal_flow():
    """When cancelling an appointment with > 2 hours notice, do not show urgency policy warning."""
    conv = get_conversation("user_canc_normal")
    conv["stage"] = "greeting"

    # Appointment 48 hours in the future
    far_dt = datetime.now(TZ_AR) + timedelta(hours=48)
    mock_apt = {
        "id": "apt_normal_1",
        "date": far_dt.isoformat(),
        "service": {"name": "Balayage VIP"},
        "status": "CONFIRMED",
    }

    with patch("agent.get_upcoming_appointments", new_callable=AsyncMock, return_value=[mock_apt]):
        reply = await process_message("user_canc_normal", "necesito cancelar mi turno")

        assert "Aviso de Política: Faltan menos de 2 horas" not in reply
        assert conv["stage"] == "confirm_cancellation"


@pytest.mark.anyio
async def test_confirm_cancellation_urgent_includes_policy_reminder():
    """When client confirms urgent cancellation, finalize and remind 2 hours policy for future."""
    conv = get_conversation("user_canc_confirm")
    conv["stage"] = "confirm_cancellation"

    soon_dt = datetime.now(TZ_AR) + timedelta(minutes=30)
    conv["cancelling_apt"] = {
        "id": "apt_urgent_2",
        "date": soon_dt.isoformat(),
        "service": {"name": "Nutrición Capilar"},
    }

    with patch("agent.cancel_appointment", new_callable=AsyncMock, return_value=True):
        reply = await process_message("user_canc_confirm", "sí, confirmo la cancelación")

        assert "cancelado con éxito" in reply
        assert "2 horas de anticipación" in reply


# ── 3. Cross-Selling Opportunities Tests ───────────────────

def test_detect_cross_sell_opportunity_color_affinity_with_haircut():
    """Should detect cross-sell when client has color history but only books haircut."""
    mock_profile = {
        "favorite_services": ["Balayage VIP", "Color y Mechas"],
        "favorite_categories": ["COLORACION", "PELUQUERIA"],
        "total_visits": 4,
    }

    with patch("services.memory.build_structured_customer_profile", return_value=mock_profile):
        haircut_service = {"id": "s_corte", "name": "Corte Signature", "price": 25000}
        opportunity = detect_cross_sell_opportunity("5491112345678", haircut_service)

        assert opportunity is not None
        assert opportunity["opportunity"] is True
        assert "coloración" in opportunity["affinity"].lower()
        assert "Baño de Luz" in opportunity["message_hint"]


def test_detect_cross_sell_opportunity_no_cross_sell_if_already_booking_color():
    """Should NOT detect cross-sell if the client is already booking a color treatment."""
    mock_profile = {
        "favorite_services": ["Balayage VIP"],
        "favorite_categories": ["COLORACION"],
        "total_visits": 3,
    }

    with patch("services.memory.build_structured_customer_profile", return_value=mock_profile):
        color_service = {"id": "s_color", "name": "Color Total y Mechas", "price": 45000}
        opportunity = detect_cross_sell_opportunity("5491112345678", color_service)

        assert opportunity is None


@pytest.mark.anyio
async def test_cross_sell_acceptance_flow():
    """When a cross-sell is offered and client accepts it, add treatment to selected_services."""
    conv = get_conversation("user_xsell_flow")
    conv["stage"] = "date_selection"
    conv["selected_service"] = {"id": "s_corte", "name": "Corte Signature", "price": 25000}
    conv["selected_services"] = [conv["selected_service"]]
    conv["cross_sell_offered"] = "Baño de Luz / Nutrición Brillo"

    mock_treatment = {"id": "s_luz", "name": "Baño de Luz", "price": 12000, "duration": 30}

    with patch("agent.classify_intent_with_confidence_async", new_callable=AsyncMock, return_value=("OTHER", 0.90)), \
         patch("agent.get_services", return_value=[
             conv["selected_service"],
             mock_treatment
         ]):
        reply = await process_message("user_xsell_flow", "dale, sumalo por favor!")

        assert "Baño de Luz" in reply
        assert len(conv["selected_services"]) == 2
        assert conv["cross_sell_offered"] is None
