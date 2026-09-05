# ============================================
# Unit Tests for Customer Memory & Semantic Profile
# ============================================

import pytest
from unittest.mock import patch
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.memory import (
    build_structured_customer_profile,
    get_customer_semantic_profile,
    format_memory_system_context,
    remember_preference,
    extract_and_remember_preferences,
)


def test_build_structured_customer_profile_empty():
    """Verify profile extraction for a new client with no prior history or prefs."""
    with patch("services.memory.get_customer_preferences", return_value={}):
        with patch("services.memory.get_customer_history", return_value=[]):
            profile = build_structured_customer_profile("5491112345678")
            assert profile["total_visits"] == 0
            assert profile["loyalty_tier"] == "Cliente Nueva"
            assert profile["favorite_services"] == []
            assert profile["last_service_name"] is None

            context = format_memory_system_context("5491112345678")
            assert context == ""


def test_build_structured_customer_profile_frequent_client():
    """Verify profile extraction for a frequent client with past services and preferences."""
    mock_history = [
        {"date": datetime(2026, 8, 15, 10, 30), "service_name": "Corte Signature", "category": "cabello"},
        {"date": datetime(2026, 8, 1, 11, 0), "service_name": "Corte Signature", "category": "cabello"},
        {"date": datetime(2026, 7, 10, 15, 0), "service_name": "Uñas Gel Luxury", "category": "unas"},
        {"date": datetime(2026, 6, 20, 10, 0), "service_name": "Corte Signature", "category": "cabello"},
    ]
    mock_prefs = {
        "favorite_style": "Corte en capas con flequillo cortina",
        "notes": "Prefiere agua tibia para el lavado",
    }

    with patch("services.memory.get_customer_preferences", return_value=mock_prefs):
        with patch("services.memory.get_customer_history", return_value=mock_history):
            profile = build_structured_customer_profile("5491112345678")

            assert profile["total_visits"] == 4
            assert profile["loyalty_tier"] == "Cliente Frecuente"
            assert profile["favorite_services"][0] == "Corte Signature"
            assert profile["favorite_categories"][0] == "cabello"
            assert profile["last_service_name"] == "Corte Signature"
            assert profile["preferred_time"] == "Mañana (9:00 - 13:00)"

            context = format_memory_system_context("5491112345678")
            assert "[PERFIL E HISTORIAL DE LA CLIENTA" in context
            assert "Cliente Frecuente" in context
            assert "Corte Signature" in context
            assert "Corte en capas con flequillo cortina" in context
            assert "Prefiere agua tibia" in context


def test_extract_and_remember_preferences():
    """Verify preference extraction from customer chat messages."""
    with patch("services.memory.remember_preference") as mock_remember:
        extract_and_remember_preferences("5491112345678", "Prefiero ir a la mañana siempre los sábados")
        mock_remember.assert_any_call("5491112345678", "preferred_time", "Mañana (9:00 - 13:00)")
        mock_remember.assert_any_call("5491112345678", "preferred_day", "Sábado")
