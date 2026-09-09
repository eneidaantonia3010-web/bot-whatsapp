# ============================================
# Glow Studio by Sofia — Same-Day Real-Time Booking Tests
# Timezone: America/Argentina/Buenos_Aires (UTC-3)
# ============================================

import sys
import os
import pytest
from datetime import datetime
import pytz
from unittest.mock import patch, AsyncMock

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import (
    parse_date,
    process_message,
    get_conversation,
    TZ_AR,
)
from services.calendar import create_appointment_via_api


# Frozen Time Anchor: Wednesday 2026-09-09 at 14:00:00 ART
FROZEN_WEDNESDAY_14HS = datetime(2026, 9, 9, 14, 0, 0, tzinfo=TZ_AR)


class MockFrozenDateTime(datetime):
    @classmethod
    def now(cls, tz=None):
        if tz:
            return FROZEN_WEDNESDAY_14HS.astimezone(tz)
        return FROZEN_WEDNESDAY_14HS


# ── 1. Unit Tests for parse_date with Frozen Wednesday at 14:00 hs ────────────

def test_same_day_parse_date_wednesday_afternoon():
    """
    Clock frozen at 14:00 on a Wednesday (2026-09-09):
    - 'hoy a las 6 de la tarde' -> 2026-09-09 18:00
    - 'el miercoles a las 6 de la tarde' -> 2026-09-09 18:00 (future today)
    - 'miercoles 18hs' -> 2026-09-09 18:00
    - 'miercoles a las 10 de la mañana' -> 2026-09-16 10:00 (past today, moves to next week)
    """
    with patch("agent.datetime", MockFrozenDateTime):
        # 1. Explicit 'hoy' afternoon
        res1 = parse_date("quiero un turno para hoy a las 6 de la tarde")
        assert res1 is not None, "Failed to parse 'hoy a las 6 de la tarde'"
        date_str, time_str = res1
        assert date_str == "2026-09-09"
        assert time_str == "18:00"

        # 2. Explicit 'miercoles' at 18:00 (same day, future hour)
        res2 = parse_date("turno el miercoles a las 6 de la tarde")
        assert res2 is not None
        assert res2[0] == "2026-09-09"
        assert res2[1] == "18:00"

        # 3. Short format 'miercoles 18hs'
        res3 = parse_date("miercoles 18hs")
        assert res3 is not None
        assert res3[0] == "2026-09-09"
        assert res3[1] == "18:00"

        # 4. 'hoy miercoles a las 18:30'
        res4 = parse_date("hoy miercoles a las 18:30")
        assert res4 is not None
        assert res4[0] == "2026-09-09"
        assert res4[1] == "18:30"

        # 5. Hour already passed today without 'hoy' ('miercoles 10 de la mañana' when clock is 14:00)
        res_past = parse_date("turno el miercoles a las 10 de la mañana")
        assert res_past is not None
        assert res_past[0] == "2026-09-16"  # Jumps to next Wednesday
        assert res_past[1] == "10:00"

        # 6. Tomorrow Thursday 15hs
        res_thu = parse_date("jueves 15hs")
        assert res_thu is not None
        assert res_thu[0] == "2026-09-10"
        assert res_thu[1] == "15:00"


# ── 2. End-to-End FSM Real-Time Same-Day Booking Simulation ───────────────────

@pytest.mark.anyio
async def test_same_day_booking_fsm_end_to_end():
    """
    Simulates live WhatsApp customer requesting a same-day appointment at 18:00 on Wednesday:
    1. Customer selects a service.
    2. Customer says: 'quiero un turno para hoy a las 6 de la tarde'.
    3. Availability check confirms 18:00 is available for 2026-09-09.
    4. Customer provides contact info and confirms 'sí'.
    5. Verifies create_appointment_via_api receives date='2026-09-09T18:00:00-03:00'.
    """
    sender_id = "5491177665544"
    mock_service = {
        "id": "srv-corte-01",
        "name": "Corte Signature",
        "price": 18000,
        "duration": 45,
        "category": "cabello",
    }
    mock_services = [mock_service]
    state_db = {}

    def mock_get(s_id):
        return state_db.get(s_id)

    def mock_save(s_id, state):
        state_db[s_id] = state

    mock_availability_today = [
        {"time": "14:30", "available": True, "score": 70, "isRecommended": False},
        {"time": "15:00", "available": True, "score": 75, "isRecommended": False},
        {"time": "18:00", "available": True, "score": 95, "isRecommended": True},
        {"time": "18:30", "available": True, "score": 90, "isRecommended": True},
    ]

    with patch("agent.datetime", MockFrozenDateTime), \
         patch("agent.get_conversation_state", side_effect=mock_get), \
         patch("agent.save_conversation_state", side_effect=mock_save), \
         patch("agent.get_services", return_value=mock_services), \
         patch("agent.get_service_by_index", side_effect=lambda idx: mock_service if idx == 1 else None), \
         patch("agent.get_service_by_name", side_effect=lambda name: mock_service if "corte" in (name or "").lower() else None), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.get_availability", new_callable=AsyncMock) as mock_avail, \
         patch("agent.create_appointment_via_api", new_callable=AsyncMock) as mock_create:

        mock_avail.return_value = mock_availability_today
        mock_create.return_value = {
            "id": "apt-sameday-999",
            "date": "2026-09-09T18:00:00-03:00",
            "status": "CONFIRMED",
            "service": mock_service,
        }

        # Step 1: User selects service from catalog
        res1 = await process_message(sender_id, "1", platform="WHATSAPP")
        assert "Corte Signature" in str(res1)
        conv = get_conversation(sender_id)
        assert conv["stage"] == "date_selection"
        assert conv["selected_service"]["name"] == "Corte Signature"

        # Step 2: User requests same-day booking: 'quiero un turno para hoy a las 6 de la tarde'
        res2 = await process_message(sender_id, "quiero un turno para hoy a las 6 de la tarde", platform="WHATSAPP")
        mock_avail.assert_called_with("2026-09-09", "srv-corte-01")

        conv = get_conversation(sender_id)
        assert conv["selected_date"] == "2026-09-09"
        assert conv["selected_time"] == "18:00"
        assert conv["stage"] == "name_input"
        assert "18:00hs" in str(res2)

        # Step 3: Customer provides full name
        res3 = await process_message(sender_id, "Lucía Domínguez", platform="WHATSAPP")
        conv = get_conversation(sender_id)
        assert conv["customer_name"] == "Lucía Domínguez"
        assert conv["stage"] == "phone_input"

        # Step 4: Customer provides WhatsApp number
        res4 = await process_message(sender_id, "11 3344 5566", platform="WHATSAPP")
        conv = get_conversation(sender_id)
        assert conv["stage"] == "confirmation"
        assert "Resumen de tu turno" in str(res4)

        # Step 5: Customer confirms with 'sí'
        res5 = await process_message(sender_id, "sí", platform="WHATSAPP")
        assert "Turno confirmado" in str(res5)

        # Verify exact API call payload for same-day booking
        mock_create.assert_called_once()
        create_kwargs = mock_create.call_args.kwargs
        assert create_kwargs["date"] == "2026-09-09T18:00:00-03:00"
        assert create_kwargs["service_id"] == "srv-corte-01"
        assert create_kwargs["customer_name"] == "Lucía Domínguez"


# ── 3. All-in-One Message Same-Day Booking Simulation ────────────────────────

@pytest.mark.anyio
async def test_same_day_booking_all_in_one_message():
    """
    Simulates a direct message with both service and same-day date/time:
    'Hola, quiero un turno para Corte Signature hoy a las 6 de la tarde'
    """
    sender_id = "5491133221100"
    mock_service = {
        "id": "srv-corte-01",
        "name": "Corte Signature",
        "price": 18000,
        "duration": 45,
        "category": "cabello",
    }
    mock_services = [mock_service]
    state_db = {}

    def mock_get(s_id):
        return state_db.get(s_id)

    def mock_save(s_id, state):
        state_db[s_id] = state

    mock_availability = [
        {"time": "18:00", "available": True, "score": 95, "isRecommended": True},
    ]

    with patch("agent.datetime", MockFrozenDateTime), \
         patch("agent.get_conversation_state", side_effect=mock_get), \
         patch("agent.save_conversation_state", side_effect=mock_save), \
         patch("agent.get_services", return_value=mock_services), \
         patch("agent.get_service_by_name", return_value=mock_service), \
         patch("agent.get_customer_history", return_value=[]), \
         patch("agent.get_availability", new_callable=AsyncMock) as mock_avail:

        mock_avail.return_value = mock_availability

        res = await process_message(sender_id, "Hola, quiero un turno para Corte Signature hoy a las 6 de la tarde")
        assert res is not None
        mock_avail.assert_called_with("2026-09-09", "srv-corte-01")

        conv = get_conversation(sender_id)
        assert conv["selected_service"]["name"] == "Corte Signature"
        assert conv["selected_date"] == "2026-09-09"
        assert conv["selected_time"] == "18:00"
        assert conv["stage"] == "name_input"


# ── 4. Same-Day Busy Slot Fallback to Alternatives ───────────────────────────

@pytest.mark.anyio
async def test_same_day_booking_occupied_slot_fallback():
    """
    If the requested same-day slot (18:00) is occupied, the bot suggests available times for today.
    """
    sender_id = "5491122334455"
    mock_service = {
        "id": "srv-corte-01",
        "name": "Corte Signature",
        "price": 18000,
        "duration": 45,
        "category": "cabello",
    }
    state_db = {
        sender_id: {
            "stage": "date_selection",
            "selected_service": mock_service,
            "selected_services": [mock_service],
            "chat_history": [],
            "fallback_count": 0,
        }
    }

    mock_availability_full_18 = [
        {"time": "18:00", "available": False, "score": 0},
        {"time": "18:30", "available": True, "score": 90, "isRecommended": True},
        {"time": "19:00", "available": True, "score": 85, "isRecommended": True},
    ]

    with patch("agent.datetime", MockFrozenDateTime), \
         patch("agent.get_conversation_state", side_effect=lambda sid: state_db.get(sid)), \
         patch("agent.save_conversation_state", side_effect=lambda sid, st: state_db.update({sid: st})), \
         patch("agent.get_availability", new_callable=AsyncMock) as mock_avail:

        mock_avail.return_value = mock_availability_full_18

        res = await process_message(sender_id, "quiero hoy a las 6 de la tarde")
        assert "ya está ocupado" in str(res)
        assert "*18:30hs*" in str(res)
        assert "*19:00hs*" in str(res)
