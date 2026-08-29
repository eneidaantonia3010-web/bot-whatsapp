# ============================================
# Glow Studio by Sofia — Calendar Service
# ============================================

import os
import logging
import httpx

logger = logging.getLogger("glow_bot.calendar")

try:
    from config import API_URL, API_SECRET_KEY
except ImportError:
    API_URL = os.getenv("API_URL", "https://glow-studio-api-2vzt.onrender.com")
    API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")


def _get_auth_headers() -> dict[str, str]:
    headers = {}
    if API_SECRET_KEY:
        headers["x-api-key"] = API_SECRET_KEY
    return headers


async def create_appointment_via_api(
    date: str,
    service_id: str,
    customer_name: str,
    customer_phone: str,
    source: str = "INSTAGRAM",
    notes: str = "",
) -> dict | None:
    """Create an appointment via the Express API (which handles Calendar + DB)."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/appointments",
                headers=_get_auth_headers(),
                json={
                    "date": date,
                    "serviceId": service_id,
                    "customerName": customer_name,
                    "customerPhone": customer_phone,
                    "notes": notes,
                    "source": source,
                },
                timeout=15.0,
            )
            if response.status_code == 201:
                logger.info("Appointment created successfully via API")
                return response.json()
            elif response.status_code == 409:
                logger.warning(f"Appointment time conflict: {response.text}")
                return {"conflict": True, "error": "El horario ya no está disponible."}
            else:
                logger.error(f"API error creating appointment ({response.status_code}): {response.text}")
                return None
    except Exception as e:
        logger.exception(f"Calendar/API error: {e}")
        return None


async def get_availability(date: str, service_id: str) -> list[dict] | None:
    """Get available time slots from the Express API. Returns None on network/API failure."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_URL}/api/appointments/availability",
                headers=_get_auth_headers(),
                params={"date": date, "serviceId": service_id},
                timeout=10.0,
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(f"Availability check non-200 status: {response.status_code}")
            return None
    except Exception as e:
        logger.exception(f"Availability check error: {e}")
        return None


async def get_upcoming_appointments(phone: str = None, instagram: str = None) -> list[dict]:
    """Get upcoming active appointments for a customer."""
    try:
        params = {}
        if phone:
            params["phone"] = phone
        if instagram:
            params["instagram"] = instagram

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_URL}/api/appointments/customer/upcoming",
                headers=_get_auth_headers(),
                params=params,
                timeout=10.0,
            )
            if response.status_code == 200:
                return response.json()
            return []
    except Exception as e:
        logger.exception(f"Error fetching upcoming appointments: {e}")
        return []


async def confirm_upcoming_appointment(phone: str = None, instagram: str = None) -> dict | None:
    """Confirm a pending appointment within 48h."""
    try:
        payload = {}
        if phone:
            payload["phone"] = phone
        if instagram:
            payload["instagram"] = instagram

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/appointments/confirm-upcoming",
                headers=_get_auth_headers(),
                json=payload,
                timeout=10.0,
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception as e:
        logger.exception(f"Error confirming upcoming appointment: {e}")
        return None


async def cancel_appointment(appointment_id: str, reason: str = "Cancelado por cliente via bot") -> dict | None:
    """Cancel an appointment via API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/appointments/{appointment_id}/cancel",
                headers=_get_auth_headers(),
                json={"reason": reason},
                timeout=10.0,
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception as e:
        logger.exception(f"Error cancelling appointment: {e}")
        return None


async def reschedule_appointment(appointment_id: str, new_date: str) -> dict | None:
    """Reschedule an appointment to a new date/time via API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/appointments/{appointment_id}/reschedule",
                headers=_get_auth_headers(),
                json={"newDate": new_date},
                timeout=10.0,
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception as e:
        logger.exception(f"Error rescheduling appointment: {e}")
        return None


async def add_to_waitlist_via_api(
    customer_name: str,
    customer_phone: str,
    service_id: str,
    preferred_date: str,
    time_range: str = "cualquiera",
    notes: str = "Anotada via bot",
) -> dict | None:
    """Add a customer to the smart waitlist via API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/waitlist",
                headers=_get_auth_headers(),
                json={
                    "customerName": customer_name,
                    "customerPhone": customer_phone,
                    "serviceId": service_id,
                    "preferredDate": preferred_date,
                    "timeRange": time_range,
                    "notes": notes,
                },
                timeout=10.0,
            )
            if response.status_code in (200, 201):
                logger.info(f"Customer {customer_name} added to waitlist successfully")
                return response.json()
            return None
    except Exception as e:
        logger.exception(f"Error adding to waitlist via API: {e}")
        return None


