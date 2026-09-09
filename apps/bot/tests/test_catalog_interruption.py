# ============================================
# Glow Studio by Sofia — Catalog Interruption & Stale State Reset Tests
# ============================================

import os
import sys
import pytest
from unittest.mock import patch, AsyncMock

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import process_message, conversations, get_conversation
from main import app
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def clear_conversations():
    """Clear conversation state between tests."""
    conversations.clear()
    yield
    conversations.clear()


@pytest.mark.anyio
async def test_option_5_interrupts_phone_input_and_resets_stale_context():
    """
    Simulate a user session stuck in 'phone_input' with stale date/time.
    Sending '5' must forcefully reset the booking flow, select 'Facial Glow',
    and advance the session cleanly to 'date_selection'.
    """
    sender_id = "test_user_stale_phone_5"
    conv = get_conversation(sender_id)
    conv["stage"] = "phone_input"
    conv["customer_name"] = "Florencia"
    conv["selected_service"] = {
        "id": "cmt4niln50002ogpssn90a7pt",
        "name": "Corte Signature",
        "price": 25000,
        "duration": 45,
    }
    conv["selected_services"] = [conv["selected_service"]]
    conv["selected_date"] = "2026-08-10"
    conv["selected_time"] = "11:00"

    with patch("services.semantic_router.llm_pool.get_semantic_completion_async", new_callable=AsyncMock) as mock_llm, \
         patch("services.database.save_conversation_state"):
        mock_llm.return_value = '{"intent": "BOOKING", "has_digression": false, "change_of_mind": false, "extracted_slots": {"services": ["Facial Glow"]}}'

        response = await process_message(sender_id, "5")

        # Response must acknowledge Facial Glow and ask for date/time
        assert "Facial Glow" in response
        assert "día y hora" in response.lower() or "cuándo" in response.lower() or "para qué día" in response.lower()

        # Context must be cleanly reset to Facial Glow and date_selection
        assert conv["stage"] == "date_selection"
        assert conv["selected_service"]["name"] == "Facial Glow"
        assert conv["selected_date"] is None
        assert conv["selected_time"] is None


@pytest.mark.anyio
async def test_service_name_interrupts_confirmation_and_resets_context():
    """
    Simulate a user session in 'confirmation'. Sending 'Facial Glow'
    must reset the unconfirmed appointment and return to 'date_selection'.
    """
    sender_id = "test_user_stale_confirmation"
    conv = get_conversation(sender_id)
    conv["stage"] = "confirmation"
    conv["customer_name"] = "Carolina"
    conv["customer_phone"] = "5491133445566"
    conv["selected_service"] = {
        "id": "cmt4nilsu0004ogpsbfx7nv2l",
        "name": "Uñas Gel Luxury",
        "price": 28000,
        "duration": 75,
    }
    conv["selected_services"] = [conv["selected_service"]]
    conv["selected_date"] = "2026-08-15"
    conv["selected_time"] = "16:00"

    with patch("services.semantic_router.llm_pool.get_semantic_completion_async", new_callable=AsyncMock) as mock_llm, \
         patch("services.database.save_conversation_state"):
        mock_llm.return_value = '{"intent": "CHANGE_MIND", "has_digression": false, "change_of_mind": true, "extracted_slots": {"services": ["Facial Glow"]}}'

        response = await process_message(sender_id, "Facial Glow")

        assert "Facial Glow" in response
        assert conv["stage"] == "date_selection"
        assert conv["selected_service"]["name"] == "Facial Glow"
        assert conv["selected_date"] is None
        assert conv["selected_time"] is None


@pytest.mark.anyio
async def test_catalog_option_with_date_time_in_single_turn():
    """
    If the user sends option '5' along with date and time ('5 mañana 15hs'),
    it should register Facial Glow, parse the date/time, and proceed to name/phone.
    """
    sender_id = "test_user_opt5_with_date"
    conv = get_conversation(sender_id)
    conv["stage"] = "service_selection"

    with patch("services.semantic_router.llm_pool.get_semantic_completion_async", new_callable=AsyncMock) as mock_llm, \
         patch("services.database.save_conversation_state"):
        mock_llm.return_value = '{"intent": "BOOKING", "has_digression": false, "change_of_mind": false, "extracted_slots": {"services": ["Facial Glow"], "date_time_text": "mañana 15hs"}}'

        response = await process_message(sender_id, "5 mañana 15hs")

        assert "Facial Glow" in response
        assert conv["selected_service"]["name"] == "Facial Glow"
        assert conv["selected_time"] == "15:00"
        # Since customer_name is not set, it should advance to name_input
        assert conv["stage"] == "name_input"
        assert "nombre" in response.lower()


@pytest.mark.anyio
async def test_all_catalog_options_1_to_6_select_correct_service():
    """Test that numbers 1 through 6 map to the expected salon services."""
    expected = {
        1: "Corte Signature",
        2: "Corte Hombre Premium",
        3: "Uñas Gel Luxury",
        4: "Esmaltado Semi Pro",
        5: "Facial Glow",
        6: "Tratamiento Anti-frizz Keratina",
    }

    for num, expected_service_name in expected.items():
        sender_id = f"test_user_num_{num}"
        conv = get_conversation(sender_id)
        conv["stage"] = "phone_input"  # Start in a stale stage to prove interruption
        conv["selected_date"] = "2026-07-01"

        with patch("services.semantic_router.llm_pool.get_semantic_completion_async", new_callable=AsyncMock) as mock_llm, \
             patch("services.database.save_conversation_state"):
            mock_llm.return_value = f'{{"intent": "BOOKING", "has_digression": false, "change_of_mind": false, "extracted_slots": {{"services": ["{expected_service_name}"]}}}}'

            response = await process_message(sender_id, str(num))

            assert expected_service_name in response
            assert conv["stage"] == "date_selection"
            assert conv["selected_service"]["name"] == expected_service_name
            assert conv["selected_date"] is None


def test_process_message_endpoint_recovers_and_purges_on_exception():
    """
    Test that /process-message endpoint catches any unhandled FSM exception,
    purges the corrupted session from memory and database, and returns
    a resilient catalog fallback.
    """
    client = TestClient(app)
    sender_id = "test_user_corrupt_crash"

    # Pre-populate corrupt session
    conv = get_conversation(sender_id)
    conv["stage"] = "broken_corrupted_stage"

    with patch("main.process_message", side_effect=RuntimeError("FSM internal slot corruption")), \
         patch("services.database.delete_conversation_state") as mock_delete:
        
        response = client.post(
            "/process-message",
            json={"sender_id": sender_id, "message": "5", "platform": "WHATSAPP"},
            headers={"x-api-key": "glow-studio-internal-secret-2026"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "Glow Studio by Sofia" in data["response"]
        assert "Facial Glow" in data["response"] or "Corte Signature" in data["response"]

        # Verify corrupted session was purged
        assert sender_id not in conversations
        mock_delete.assert_called_with(sender_id)
