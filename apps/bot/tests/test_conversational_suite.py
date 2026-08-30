# -*- coding: utf-8 -*-
# ============================================
# Golden Conversational & AI Test Suite for Glow Studio Bot
# ============================================

import os
import sys
import pytest
from datetime import datetime, timedelta
import pytz

# Add bot directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import (
    parse_date,
    format_appointment_datetime,
    _is_close_confirmation_answer,
    _apply_output_guardrails,
    _format_price,
    _format_date_display,
    get_conversation,
)
from services.phone_utils import normalize_phone
from services.intent_classifier import classify_intent
from services.language_detector import detect_language
from services.memory import format_memory_system_context
from services.llm_pool import normalize_history_for_groq


# ── 1. Phone Normalization Tests ─────────────────────────

def test_normalize_phone_argentina():
    assert normalize_phone("+54 9 11 1234-5678") == "5491112345678"
    assert normalize_phone("1112345678") == "5491112345678"
    assert normalize_phone("5491112345678") == "5491112345678"
    assert normalize_phone("invalid") is None


# ── 2. Time & Date Parsing Edge Cases (Bug #14 Fix) ───────

def test_parse_date_explicit_time_context():
    res = parse_date("lunes a las 14hs")
    assert res is not None
    _, time_str = res
    assert time_str == "14:00"


def test_parse_date_with_minutes():
    res = parse_date("martes 16:30")
    assert res is not None
    _, time_str = res
    assert time_str == "16:30"


def test_parse_date_rejects_sunday():
    res = parse_date("el domingo a las 15hs")
    assert res is None


def test_parse_date_avoids_number_confusion():
    # "somos 2 personas" should NOT be parsed as 14:00 or 02:00
    res = parse_date("somos 2 personas para el corte")
    assert res is None


def test_parse_date_morning_vs_afternoon():
    res_am = parse_date("mañana 9 de la mañana")
    if res_am:
        assert res_am[1] == "09:00"

    res_pm = parse_date("mañana 4 de la tarde")
    if res_pm:
        assert res_pm[1] == "16:00"


# ── 3. Language Detection & Multi-lingual Tests ───────────

def test_language_detector_spanish():
    assert detect_language("Hola quiero reservar un turno para mañana") == "es"


def test_language_detector_portuguese():
    assert detect_language("Olá, gostaria de agendar um horário para fazer as unhas por favor") == "pt"


def test_language_detector_english():
    assert detect_language("Hi, can I book an appointment for a haircut tomorrow?") == "en"


# ── 4. Confirmation Answer Classifier ──────────────────────

def test_close_confirmation_answers():
    assert _is_close_confirmation_answer("sí, confirmo") is True
    assert _is_close_confirmation_answer("dale de una") is True
    assert _is_close_confirmation_answer("no, quiero cambiar") is False
    assert _is_close_confirmation_answer("cancelar") is False
    assert _is_close_confirmation_answer("cuánto cuesta?") is None


# ── 5. Output Guardrails (Anti-Hallucination) ───────────────

def test_output_guardrails_sunday_warning():
    raw_response = "Te esperamos el domingo estamos abiertos."
    guarded = _apply_output_guardrails(raw_response)
    assert "domingos el salón permanece cerrado" in guarded


def test_output_guardrails_clean_response():
    raw_response = "Te esperamos el martes a las 15:00hs."
    guarded = _apply_output_guardrails(raw_response)
    assert guarded == raw_response


# ── 6. Intent Classifier & Confidence Scoring ─────────────────

def test_intent_classifier_direct_patterns():
    assert classify_intent("donde estan ubicados?") == "FAQ_UBICACION"
    assert classify_intent("que medios de pago aceptan?") == "FAQ_PAGOS"
    assert classify_intent("quiero cancelar mi cita") == "CANCEL_APPOINTMENT"
    assert classify_intent("reprogramar mi turno") == "RESCHEDULE_APPOINTMENT"
    assert classify_intent("quiero hablar con sofia una persona") == "HUMAN_ESCALATION"
    assert classify_intent("muchas gracias chicas!") == "THANKS"


def test_intent_classifier_confidence_scoring():
    from services.intent_classifier import classify_intent_with_confidence, CONFIDENCE_THRESHOLD

    intent_greet, conf_greet = classify_intent_with_confidence("hola")
    assert intent_greet == "GREETING"
    assert conf_greet >= CONFIDENCE_THRESHOLD

    intent_faq, conf_faq = classify_intent_with_confidence("donde estan ubicados?")
    assert intent_faq == "FAQ_UBICACION"
    assert conf_faq >= CONFIDENCE_THRESHOLD


# ── 7. LLM History Normalization ───────────────────────────

def test_normalize_history_for_groq():
    raw_history = [
        {"role": "user", "parts": ["Hola"]},
        {"role": "model", "parts": ["¡Hola! ¿En qué te ayudo?"]},
    ]
    normalized = normalize_history_for_groq(raw_history)
    assert len(normalized) == 2
    assert normalized[0] == {"role": "user", "content": "Hola"}
    assert normalized[1] == {"role": "assistant", "content": "¡Hola! ¿En qué te ayudo?"}


# ── 8. Formatting Utilities ────────────────────────────────

def test_format_price():
    assert _format_price(25000) == "$25.000"
    assert _format_price(18500) == "$18.500"


def test_format_appointment_datetime():
    iso = "2026-09-10T14:30:00.000Z"
    formatted = format_appointment_datetime(iso)
    assert "septiembre" in formatted
    assert "11:30" in formatted

