# ============================================
# Glow Studio by Sofia — Database Service
# ============================================

import os
import json
import logging
from contextlib import contextmanager
from typing import Optional, Any

try:
    import psycopg2
    from psycopg2.pool import ThreadedConnectionPool
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    ThreadedConnectionPool = None
    RealDictCursor = None

logger = logging.getLogger("glow_bot.database")

_pool: Optional[Any] = None if not HAS_PSYCOPG2 else None


def get_pool():
    """Get or initialize the PostgreSQL connection pool."""
    global _pool
    if not HAS_PSYCOPG2:
        logger.warning("psycopg2 is not installed. Database direct pool is disabled.")
        return None

    if _pool is None or getattr(_pool, "closed", False):
        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            raise ValueError("DATABASE_URL not set")
        minconn = int(os.getenv("DB_MIN_CONN", "1"))
        maxconn = int(os.getenv("DB_MAX_CONN", "10"))
        _pool = ThreadedConnectionPool(
            minconn=minconn,
            maxconn=maxconn,
            dsn=database_url,
            cursor_factory=RealDictCursor
        )
    return _pool


@contextmanager
def get_db_connection():
    """On-demand database connection manager optimized for Neon Scale-to-Zero auto-suspend."""
    if not HAS_PSYCOPG2:
        yield None
        return

    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        yield None
        return

    conn = None
    try:
        conn = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor,
            connect_timeout=10,
        )
        conn.autocommit = True
        yield conn
    except Exception as e:
        logger.error(f"Database query connection error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn and not conn.closed:
            conn.close()


def get_services() -> list[dict]:
    """Fetch all active services from the database."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, description, price, duration, category "
                'FROM services WHERE active = true ORDER BY "order" ASC'
            )
            return cur.fetchall()


def get_service_by_name(name: str) -> Optional[dict]:
    """Find a service by partial name match."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, description, price, duration, category "
                "FROM services WHERE active = true AND LOWER(name) LIKE %s",
                (f"%{name.lower()}%",),
            )
            return cur.fetchone()


def get_service_by_index(index: int) -> Optional[dict]:
    """Get a service by its display order (1-based index)."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, name, description, price, duration, category '
                'FROM services WHERE active = true ORDER BY "order" ASC '
                "LIMIT 1 OFFSET %s",
                (index - 1,),
            )
            return cur.fetchone()


def find_customer_by_instagram(ig_id: str) -> Optional[dict]:
    """Find a customer by their Instagram sender ID."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, phone, email, instagram FROM customers WHERE instagram = %s",
                (ig_id,),
            )
            return cur.fetchone()


def create_customer(name: str, phone: str, instagram: Optional[str] = None) -> dict:
    """Create a new customer record."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO customers (id, name, phone, instagram, created_at, updated_at) "
                "VALUES (gen_random_uuid()::text, %s, %s, %s, NOW(), NOW()) RETURNING *",
                (name, phone, instagram),
            )
            conn.commit()
            return cur.fetchone()


def get_appointments_for_date(date_str: str) -> list[dict]:
    """Get all non-cancelled appointments for a given date."""
    with get_db_connection() as conn:
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


def get_conversation_state(sender_id: str) -> Optional[dict]:
    """Fetch stored conversation state for sender_id from PostgreSQL."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT state FROM conversation_states WHERE sender_id = %s",
                    (sender_id,)
                )
                row = cur.fetchone()
                if row and row.get("state"):
                    val = row["state"]
                    return json.loads(val) if isinstance(val, str) else val
                return None
    except Exception as e:
        logger.warning(f"Error reading conversation state from DB: {e}")
        return None


def save_conversation_state(sender_id: str, state: dict) -> bool:
    """Save or update conversation state in PostgreSQL."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO conversation_states (sender_id, state, updated_at) "
                    "VALUES (%s, %s, NOW()) "
                    "ON CONFLICT (sender_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()",
                    (sender_id, json.dumps(state))
                )
                conn.commit()
                return True
    except Exception as e:
        logger.error(f"Error saving conversation state to DB: {e}")
        return False


def delete_conversation_state(sender_id: str) -> bool:
    """Delete conversation state from PostgreSQL."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM conversation_states WHERE sender_id = %s",
                    (sender_id,)
                )
                conn.commit()
                return True
    except Exception as e:
        logger.warning(f"Error deleting conversation state from DB: {e}")
        return False


