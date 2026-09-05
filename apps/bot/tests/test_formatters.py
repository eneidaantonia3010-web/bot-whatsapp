import pytest
from datetime import datetime
import pytz
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.formatters import (
    format_services_catalog,
    format_appointment_datetime,
    _format_date_display,
    _format_price,
    _is_close_confirmation_answer,
    _apply_output_guardrails,
)


def test_format_services_catalog_empty():
    res = format_services_catalog([])
    assert "No hay servicios disponibles" in res


def test_format_services_catalog_populated():
    services = [
        {"name": "Corte de Puntas", "price": 15000, "duration": 45, "description": "Corte rápido"},
        {"name": "Alisado Pro", "price": 40000, "duration": 120, "description": None},
    ]
    res = format_services_catalog(services)
    assert "✨ *Nuestros Servicios* ✨" in res
    assert "1. 💇 *Corte de Puntas* — $15.000 (45min)" in res
    assert "Corte rápido" in res
    assert "2. 💇 *Alisado Pro* — $40.000 (2h)" in res


def test_format_price():
    assert _format_price(25000) == "$25.000"
    assert _format_price(1500) == "$1.500"
    assert _format_price(0) == "$0"


def test_format_date_display():
    # 2026-09-10 is a Thursday (Jueves)
    display = _format_date_display("2026-09-10")
    assert "Jueves 10 de septiembre" in display

    # Invalid string fallback
    assert _format_date_display("invalid-date") == "invalid-date"


def test_format_appointment_datetime():
    # ISO string with UTC time: 2026-09-10T17:00:00Z -> 14:00hs ART
    res = format_appointment_datetime("2026-09-10T17:00:00.000Z")
    assert "Jueves 10 de septiembre a las 14:00hs" in res

    # Datetime object
    dt = datetime(2026, 9, 10, 14, 30, tzinfo=pytz.timezone("America/Argentina/Buenos_Aires"))
    res_dt = format_appointment_datetime(dt)
    assert "14:30hs" in res_dt

    # None fallback
    assert format_appointment_datetime(None) == "fecha no especificada"


def test_is_close_confirmation_answer():
    assert _is_close_confirmation_answer("Sí, confirmo por favor") is True
    assert _is_close_confirmation_answer("dale de una") is True
    assert _is_close_confirmation_answer("perfecto") is True

    assert _is_close_confirmation_answer("no quiero gracias") is False
    assert _is_close_confirmation_answer("cancelar") is False

    assert _is_close_confirmation_answer("cuánto cuesta?") is None


def test_apply_output_guardrails():
    # Sunday with open promise must be guarded
    guarded = _apply_output_guardrails("Te esperamos el domingo estamos abiertos")
    assert "los domingos el salón permanece cerrado" in guarded

    # Weekday normal text unchanged
    normal = _apply_output_guardrails("Te esperamos el viernes a las 15hs!")
    assert "los domingos el salón permanece cerrado" not in normal
    assert normal == "Te esperamos el viernes a las 15hs!"
