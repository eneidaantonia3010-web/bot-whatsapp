# ============================================
# Unit Tests for Expert Human Escalation & PAUSED State
# ============================================

import pytest
from unittest.mock import patch, AsyncMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import process_message, get_conversation, conversations


TEST_SENDER = "5491177665544"


@pytest.fixture(autouse=True)
def clean_conversation():
    conversations.pop(TEST_SENDER, None)
    yield
    conversations.pop(TEST_SENDER, None)


@pytest.mark.anyio
async def test_escalate_on_explicit_operator_request():
    """Verify that requesting human operator immediately transitions conversation to PAUSED."""
    with patch("agent.escalate_to_human", new_callable=AsyncMock) as mock_esc:
        mock_esc.return_value = True
        res = await process_message(TEST_SENDER, "quiero hablar con una persona", platform="WHATSAPP")

        conv = get_conversation(TEST_SENDER)
        assert conv["stage"] == "PAUSED"
        mock_esc.assert_called_once()
        assert "sofía" in res.lower() or "atender" in res.lower() or "humana" in res.lower()


@pytest.mark.anyio
async def test_escalate_on_two_consecutive_low_confidence():
    """Verify that 2 consecutive low-confidence classifications freeze the bot into PAUSED."""
    with patch("agent.escalate_to_human", new_callable=AsyncMock) as mock_esc:
        mock_esc.return_value = True

        # First message with low confidence (< 0.65)
        with patch("agent.classify_intent_with_confidence_async", new_callable=AsyncMock) as mock_classify:
            mock_classify.return_value = ("UNKNOWN", 0.40)
            await process_message(TEST_SENDER, "blabla random query 1", platform="WHATSAPP")

            conv = get_conversation(TEST_SENDER)
            assert conv["low_confidence_count"] == 1
            assert conv["stage"] != "PAUSED"
            mock_esc.assert_not_called()

        # Second message with low confidence (< 0.65) -> must trigger PAUSED
        with patch("agent.classify_intent_with_confidence_async", new_callable=AsyncMock) as mock_classify:
            mock_classify.return_value = ("UNKNOWN", 0.35)
            await process_message(TEST_SENDER, "blabla random query 2", platform="WHATSAPP")

            conv = get_conversation(TEST_SENDER)
            assert conv["stage"] == "PAUSED"
            mock_esc.assert_called_once()


@pytest.mark.anyio
async def test_paused_state_freezes_bot():
    """While in PAUSED state, incoming messages must not trigger booking flow."""
    conv = get_conversation(TEST_SENDER)
    conv["stage"] = "PAUSED"

    with patch("agent.classify_intent_with_confidence_async", new_callable=AsyncMock) as mock_classify:
        res = await process_message(TEST_SENDER, "¿siguen ahí?", platform="WHATSAPP")

        # Intent classifier must NOT have been called
        mock_classify.assert_not_called()
        assert conv["stage"] == "PAUSED"
        assert "humana" in res.lower() or "menu" in res.lower()


@pytest.mark.anyio
async def test_paused_state_unpauses_on_menu():
    """Client can self-resume the automated assistant by typing 'menu' or 'hola'."""
    conv = get_conversation(TEST_SENDER)
    conv["stage"] = "PAUSED"

    res = await process_message(TEST_SENDER, "menu", platform="WHATSAPP")
    conv = get_conversation(TEST_SENDER)

    assert conv["stage"] in ("greeting", "service_selection")
    assert conv["low_confidence_count"] == 0
