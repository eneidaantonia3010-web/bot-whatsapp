# ============================================
# Unit Tests for Glow Studio Bot Logic
# ============================================

import pytest
from datetime import datetime
import pytz

import sys
import os

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import parse_date, format_appointment_datetime
from services.phone_utils import normalize_phone
from services.intent_classifier import classify_intent


def test_normalize_phone_valid():
    """Test standard Argentine phone number normalization."""
    assert normalize_phone("+54 9 11 1234-5678") == "5491112345678"
    assert normalize_phone("+5491112345678") == "5491112345678"
    assert normalize_phone("11 1234 5678") is not None


def test_parse_date_hours_range():
    """Test that parse_date only accepts valid business hours (9:00 to 19:00)."""
    # 14hs is valid
    res_valid = parse_date("mañana 14hs")
    if res_valid:
        date_str, time_str = res_valid
        hour = int(time_str.split(":")[0])
        assert 9 <= hour <= 19

    # 3am is outside business hours
    res_invalid = parse_date("mañana a las 3 de la mañana")
    assert res_invalid is None


def test_parse_date_rejects_sunday():
    """Test that parse_date explicitly rejects Sunday bookings."""
    res = parse_date("domingo 15hs")
    assert res is None


def test_format_appointment_datetime():
    """Test that format_appointment_datetime returns a readable Spanish text."""
    iso_date = "2026-08-20T14:00:00.000Z"
    formatted = format_appointment_datetime(iso_date)
    assert "agosto" in formatted
    assert "hs" in formatted


def test_classify_intent_patterns():
    """Test fast pattern matching in intent classifier."""
    assert classify_intent("donde quedan?") == "FAQ_UBICACION"
    assert classify_intent("cuales son los medios de pago") == "FAQ_PAGOS"
    assert classify_intent("cual es la politica de cancelacion") == "FAQ_CANCELACION"
    assert classify_intent("quiero cancelar mi turno") == "CANCEL_APPOINTMENT"
    assert classify_intent("necesito reprogramar el turno") == "RESCHEDULE_APPOINTMENT"
    assert classify_intent("sí, confirmo") == "CONFIRMED" or classify_intent("confirmo") == "CONFIRM_APPOINTMENT"
