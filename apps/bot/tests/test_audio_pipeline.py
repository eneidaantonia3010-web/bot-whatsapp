# ============================================
# Unit Tests for Audio Voice Note Pipeline
# ============================================

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
import base64
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from services.audio_transcribe import transcribe_audio_bytes, transcribe_audio_bytes_async


client = TestClient(app)
TEST_BOT_KEY = "test_bot_api_key_12345"
AUTH_HEADERS = {"x-api-key": TEST_BOT_KEY}


@pytest.fixture(autouse=True)
def set_test_bot_key(monkeypatch):
    monkeypatch.setattr("main.BOT_API_KEY", TEST_BOT_KEY)
    monkeypatch.setattr("main.IS_PROD", True)


def test_transcribe_audio_bytes_too_short():
    """Audio bytes under 150 bytes should be ignored without calling external API."""
    res = transcribe_audio_bytes(b"short")
    assert res is None


@pytest.mark.anyio
async def test_transcribe_audio_bytes_async_mocked():
    """Test asynchronous Whisper transcription wrapper."""
    fake_audio = b"OggS" + b"\x00" * 200
    with patch("services.audio_transcribe.transcribe_audio_bytes", return_value="hola quiero reservar un turno"):
        text = await transcribe_audio_bytes_async(fake_audio)
        assert text == "hola quiero reservar un turno"


def test_process_audio_message_success():
    """Test POST /process-audio-message end-to-end with valid base64 audio."""
    fake_bytes = b"OggS" + b"\x00" * 200
    b64_audio = base64.b64encode(fake_bytes).decode("utf-8")

    with patch("services.audio_transcribe.transcribe_audio_bytes", return_value="quiero un turno para corte"):
        with patch("main.process_message", new_callable=AsyncMock) as mock_proc:
            mock_proc.return_value = "¡Hola! Con gusto te agendo para Corte Signature ✨"

            response = client.post(
                "/process-audio-message",
                headers=AUTH_HEADERS,
                json={
                    "audio_base64": b64_audio,
                    "sender_id": "5491112345678",
                    "platform": "WHATSAPP",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "Corte Signature" in data["response"]
            assert data["data"]["transcribed_text"] == "quiero un turno para corte"
            mock_proc.assert_called_once_with(
                sender_id="5491112345678",
                message="quiero un turno para corte",
                platform="WHATSAPP",
            )


def test_process_audio_message_unclear_audio():
    """Test POST /process-audio-message fallback when Whisper cannot transcribe clearly."""
    fake_bytes = b"OggS" + b"\x00" * 200
    b64_audio = base64.b64encode(fake_bytes).decode("utf-8")

    with patch("services.audio_transcribe.transcribe_audio_bytes", return_value=None):
        response = client.post(
            "/process-audio-message",
            headers=AUTH_HEADERS,
            json={
                "audio_base64": b64_audio,
                "sender_id": "5491112345678",
                "platform": "WHATSAPP",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "no pude escuchar" in data["response"]


def test_process_audio_message_invalid_base64():
    """Test POST /process-audio-message error handling for corrupted base64."""
    response = client.post(
        "/process-audio-message",
        headers=AUTH_HEADERS,
        json={
            "audio_base64": "not-valid-base64!!$$%",
            "sender_id": "5491112345678",
            "platform": "WHATSAPP",
        },
    )
    assert response.status_code == 400
