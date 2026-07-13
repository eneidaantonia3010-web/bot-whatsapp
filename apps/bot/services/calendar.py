# ============================================
# Glow Studio by Sofia — Calendar Service
# ============================================

import os
import httpx

API_URL = os.getenv("API_URL", "http://localhost:3001")


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
                print(f"✅ Appointment created via API")
                return response.json()
            else:
                print(f"❌ API error creating appointment: {response.text}")
                return None
    except Exception as e:
        print(f"❌ Calendar/API error: {e}")
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
            return []
    except Exception as e:
        print(f"❌ Availability check error: {e}")
        return []
