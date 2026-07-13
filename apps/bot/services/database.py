# ============================================
# Glow Studio by Sofia — Database Service
# ============================================

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional


def get_connection():
    """Get a database connection to Neon PostgreSQL."""
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        raise ValueError("DATABASE_URL not set")
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


def get_services() -> list[dict]:
    """Fetch all active services from the database."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, description, price, duration, category "
                "FROM services WHERE active = true ORDER BY \"order\" ASC"
            )
            return cur.fetchall()
    finally:
        conn.close()


def get_service_by_name(name: str) -> Optional[dict]:
    """Find a service by partial name match."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, description, price, duration, category "
                "FROM services WHERE active = true AND LOWER(name) LIKE %s",
                (f"%{name.lower()}%",),
            )
            return cur.fetchone()
    finally:
        conn.close()


def get_service_by_index(index: int) -> Optional[dict]:
    """Get a service by its display order (1-based index)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, name, description, price, duration, category '
                'FROM services WHERE active = true ORDER BY "order" ASC '
                "LIMIT 1 OFFSET %s",
                (index - 1,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def find_customer_by_instagram(ig_id: str) -> Optional[dict]:
    """Find a customer by their Instagram sender ID."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, phone, email, instagram FROM customers WHERE instagram = %s",
                (ig_id,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def create_customer(name: str, phone: str, instagram: Optional[str] = None) -> dict:
    """Create a new customer record."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO customers (id, name, phone, instagram, created_at, updated_at) "
                "VALUES (gen_random_uuid()::text, %s, %s, %s, NOW(), NOW()) RETURNING *",
                (name, phone, instagram),
            )
            conn.commit()
            return cur.fetchone()
    finally:
        conn.close()


def get_appointments_for_date(date_str: str) -> list[dict]:
    """Get all non-cancelled appointments for a given date."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT a.id, a.date, a.end_date, a.status, "
                "s.name as service_name, s.duration "
                "FROM appointments a "
                "JOIN services s ON a.service_id = s.id "
                "WHERE DATE(a.date) = %s AND a.status != 'CANCELLED' "
                "ORDER BY a.date ASC",
                (date_str,),
            )
            return cur.fetchall()
    finally:
        conn.close()
