import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
import config

client = TestClient(app)
TEST_BOT_KEY = "test_bot_api_key_12345"


@pytest.fixture(autouse=True)
def set_test_bot_key(monkeypatch):
    monkeypatch.setattr("main.BOT_API_KEY", TEST_BOT_KEY)
    monkeypatch.setattr("main.IS_PROD", True)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "glow-studio-bot"
    assert "model" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "glow-studio-bot"
    assert "database" in data
    assert "groq_configured" in data


def test_process_message_requires_auth():
    # Missing authentication header
    response = client.post("/process-message", json={
        "sender_id": "test_user_1",
        "message": "Hola!",
        "platform": "whatsapp"
    })
    assert response.status_code == 401

    # Invalid authentication header
    response = client.post(
        "/process-message",
        headers={"x-api-key": "wrong_key"},
        json={
            "sender_id": "test_user_1",
            "message": "Hola!",
            "platform": "whatsapp"
        }
    )
    assert response.status_code == 403


def test_process_message_success_with_valid_key():
    with patch("main.process_message", new_callable=AsyncMock) as mock_process:
        mock_process.return_value = "¡Hola! ¿En qué te puedo ayudar hoy en Glow Studio?"

        response = client.post(
            "/process-message",
            headers={"x-api-key": TEST_BOT_KEY},
            json={
                "sender_id": "5491100000000",
                "message": "Hola",
                "platform": "WHATSAPP"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "¡Hola! ¿En qué te puedo ayudar hoy en Glow Studio?"
        assert data["image_url"] is None


def test_process_message_dict_response():
    with patch("main.process_message", new_callable=AsyncMock) as mock_process:
        mock_process.return_value = {
            "response": "Aquí tenés nuestro catálogo de cortes:",
            "image_url": "https://example.com/catalog.jpg"
        }

        response = client.post(
            "/process-message",
            headers={"x-bot-key": TEST_BOT_KEY},
            json={
                "sender_id": "5491100000000",
                "message": "Quiero ver fotos",
                "platform": "INSTAGRAM"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "Aquí tenés nuestro catálogo de cortes:"
        assert data["image_url"] == "https://example.com/catalog.jpg"


def test_reset_conversation():
    with patch("services.database.delete_conversation_state") as mock_delete:
        response = client.post(
            "/reset-conversation/user_reset_123",
            headers={"x-api-key": TEST_BOT_KEY}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        mock_delete.assert_called_once_with("user_reset_123")


def test_debug_agent_endpoint():
    response = client.get("/debug-agent")
    assert response.status_code == 200
    assert "error" in response.json() or "model" in response.json()


def test_transcribe_audio_endpoint_empty_body():
    response = client.post(
        "/transcribe-audio",
        headers={"x-api-key": TEST_BOT_KEY},
        content=b""
    )
    assert response.status_code == 200
    assert response.json()["status"] == "error"


def test_transcribe_audio_endpoint_success():
    with patch("services.audio_transcribe.transcribe_audio_bytes", return_value="Turno para hoy a las 15hs"):
        response = client.post(
            "/transcribe-audio",
            headers={"x-api-key": TEST_BOT_KEY},
            content=b"fake_ogg_audio_bytes_data"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["text"] == "Turno para hoy a las 15hs"


def test_transcribe_audio_file_endpoint_success():
    with patch("services.audio_transcribe.transcribe_audio_bytes", return_value="Audio desde archivo"):
        response = client.post(
            "/transcribe-audio-file",
            headers={"x-api-key": TEST_BOT_KEY},
            files={"file": ("test.ogg", b"dummy_audio_bytes", "audio/ogg")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["text"] == "Audio desde archivo"

