# ============================================
# Unit Tests for Admin WhatsApp Commands Service
# ============================================

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.admin_commands import (
    is_admin_sender,
    handle_admin_command,
)
from agent import process_message


ADMIN_PHONE = "5491178296781"
CLIENT_PHONE = "5491199998888"


def test_is_admin_sender_authorized():
    """Verify admin number detection works with various formatting."""
    with patch("services.admin_commands.ADMIN_PHONE", ADMIN_PHONE):
        with patch("services.admin_commands.SALON_WHATSAPP", ADMIN_PHONE):
            assert is_admin_sender(f"{ADMIN_PHONE}@s.whatsapp.net") is True
            assert is_admin_sender(f"+{ADMIN_PHONE}") is True
            assert is_admin_sender(ADMIN_PHONE) is True


def test_is_admin_sender_unauthorized():
    """Verify regular customer phone is rejected."""
    with patch("services.admin_commands.ADMIN_PHONE", ADMIN_PHONE):
        with patch("services.admin_commands.SALON_WHATSAPP", ADMIN_PHONE):
            assert is_admin_sender(CLIENT_PHONE) is False
            assert is_admin_sender(f"{CLIENT_PHONE}@s.whatsapp.net") is False
            assert is_admin_sender("") is False


@pytest.mark.anyio
async def test_handle_admin_command_rejects_non_admin():
    """Non-admin senders must return None without processing command."""
    with patch("services.admin_commands.is_admin_sender", return_value=False):
        res = await handle_admin_command(CLIENT_PHONE, "/balance")
        assert res is None


@pytest.mark.anyio
async def test_handle_admin_help():
    """Verify /ayuda returns the admin command manual."""
    with patch("services.admin_commands.is_admin_sender", return_value=True):
        res = await handle_admin_command(ADMIN_PHONE, "/ayuda")
        assert "Panel de Control" in res
        assert "/balance" in res
        assert "/turnos" in res
        assert "/bloquear" in res


@pytest.mark.anyio
async def test_handle_admin_turnos():
    """Verify /turnos parses and formats appointment agenda."""
    mock_apts = [
        {
            "id": "1",
            "date": "2026-09-05T14:00:00.000Z",
            "status": "CONFIRMED",
            "customer": {"name": "Carolina Ramos", "phone": "5491122334455"},
            "service": {"name": "Corte Signature"},
        }
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_apts

    with patch("services.admin_commands.is_admin_sender", return_value=True):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            res = await handle_admin_command(ADMIN_PHONE, "/turnos hoy")

            assert "Agenda para el" in res
            assert "Corte Signature" in res
            assert "Carolina Ramos" in res
            assert "CONFIRMED" in res


@pytest.mark.anyio
async def test_handle_admin_balance():
    """Verify /balance aggregates revenue and status counts."""
    mock_apts = [
        {"id": "1", "status": "COMPLETED", "service": {"price": 25000}},
        {"id": "2", "status": "CONFIRMED", "service": {"price": 15000}},
        {"id": "3", "status": "CANCELLED", "service": {"price": 20000}},
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_apts

    with patch("services.admin_commands.is_admin_sender", return_value=True):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            res = await handle_admin_command(ADMIN_PHONE, "/balance")

            assert "Balance Diario" in res
            assert "Completados:" in res
            assert "40,000" in res or "40.000" in res


@pytest.mark.anyio
async def test_handle_admin_bloquear_success():
    """Verify /bloquear validates parameters and posts blocked time."""
    mock_resp = MagicMock()
    mock_resp.status_code = 201

    with patch("services.admin_commands.is_admin_sender", return_value=True):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            res = await handle_admin_command(ADMIN_PHONE, "/bloquear 2026-09-08 14:00 16:00 Capacitación")

            assert "Horario Bloqueado con Éxito" in res
            assert "2026-09-08" in res
            assert "14:00 a 16:00hs" in res
            assert "Capacitación" in res


@pytest.mark.anyio
async def test_handle_admin_bloquear_invalid_syntax():
    """Verify /bloquear returns helpful error when arguments are missing or malformed."""
    with patch("services.admin_commands.is_admin_sender", return_value=True):
        res = await handle_admin_command(ADMIN_PHONE, "/bloquear fecha-invalida")
        assert "Sintaxis incorrecta" in res or "Fecha inválida" in res


@pytest.mark.anyio
async def test_process_message_intercepts_admin_command():
    """Verify process_message in agent.py routes admin commands directly."""
    with patch("agent.handle_admin_command", new_callable=AsyncMock) as mock_cmd:
        mock_cmd.return_value = "📊 Balance report OK"
        res = await process_message(ADMIN_PHONE, "/balance", platform="WHATSAPP")
        assert res == "📊 Balance report OK"
