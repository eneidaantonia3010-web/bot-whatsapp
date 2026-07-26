# ============================================
# Glow Studio by Sofia — Calendar Service
# ============================================

import os
import logging
import httpx

logger = logging.getLogger("glow_bot.calendar")

API_URL = os.getenv("API_URL", "https://glow-studio-api-q6ls.onrender.com")
if "localhost" in API_URL:
    API_URL = "https://glow-studio-api-q6ls.onrender.com"


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
            else:
                logger.error(f"API error creating appointment ({response.status_code}): {response.text}")
                return None
    except Exception as e:
        logger.exception(f"Calendar/API error: {e}")
        return None


async def get_availability(date: str, service_id: str) -> list[dict]:
    """Get available time slots from the Express API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_URL}/api/appointments/availability",
                params={"date": date, "serviceId": service_id},
                timeout=10.0,
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(f"Availability check non-200 status: {response.status_code}")
            return []
    except Exception as e:
        logger.exception(f"Availability check error: {e}")
        return []
