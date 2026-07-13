# ============================================
# Glow Studio by Sofia — Pydantic Models
# ============================================

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Platform(str, Enum):
    INSTAGRAM = "INSTAGRAM"
    WHATSAPP = "WHATSAPP"
    WEB = "WEB"


class MessageRequest(BaseModel):
    message: str
    sender_id: str
    platform: Platform = Platform.WEB
    sender_name: Optional[str] = None


class MessageResponse(BaseModel):
    response: str
    action: Optional[str] = None  # e.g., "book_appointment", "show_services"
    data: Optional[dict] = None


class ServiceInfo(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: int
    duration: int
    category: str


class AppointmentCreate(BaseModel):
    date: str
    service_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    notes: Optional[str] = None
    source: str = "INSTAGRAM"
