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

try:
    from config import DATABASE_URL
except ImportError:
    DATABASE_URL = os.getenv("DATABASE_URL", "")

logger = logging.getLogger("glow_bot.database")

_pool: Optional[Any] = None if not HAS_PSYCOPG2 else None


# In-memory service catalog cache with TTL
_services_cache: list[dict] = []
_services_cache_time: float = 0.0
_CACHE_TTL = 120.0  # 2 minutes


def get_pool():
    """Get or initialize the PostgreSQL connection pool."""
    global _pool
    if not HAS_PSYCOPG2:
        logger.warning("psycopg2 is not installed. Database direct pool is disabled.")
        return None

    if _pool is None or getattr(_pool, "closed", False):
        db_url = DATABASE_URL or os.getenv("DATABASE_URL", "")
        if not db_url:
            raise ValueError("DATABASE_URL not set")
        minconn = int(os.getenv("DB_MIN_CONN", "1"))
        maxconn = int(os.getenv("DB_MAX_CONN", "10"))
        try:
            _pool = ThreadedConnectionPool(
                minconn=minconn,
                maxconn=maxconn,
                dsn=db_url,
                cursor_factory=RealDictCursor
            )
            logger.info("✅ PostgreSQL connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing connection pool: {e}")
            _pool = None
    return _pool


@contextmanager
def get_db_connection():
    """High-performance database connection manager with pooling, liveness check & automatic failover."""
    if not HAS_PSYCOPG2:
        yield None
        return

    pool = get_pool()
    conn = None
    from_pool = False
    is_broken = False

    try:
        if pool:
            try:
                conn = pool.getconn()
                from_pool = True
                
                # Test de conexión viva contra Neon serverless
                if conn.closed:
                    raise psycopg2.OperationalError("Connection in pool is closed")
                with conn.cursor() as test_cur:
                    test_cur.execute("SELECT 1")
                conn.autocommit = True
            except Exception as e:
                logger.warning(f"Pool connection dead or Neon waking up ({e}), purging and reconnecting...")
                if conn and pool and from_pool:
                    try:
                        pool.putconn(conn, close=True)
                    except Exception:
                        pass
                conn = None
                from_pool = False

        if conn is None:
            db_url = DATABASE_URL or os.getenv("DATABASE_URL", "")
            if not db_url:
                yield None
                return
            conn = psycopg2.connect(
                db_url,
                cursor_factory=RealDictCursor,
                connect_timeout=10,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5,
            )
            conn.autocommit = True

        yield conn
    except Exception as e:
        is_broken = True
        logger.error(f"Database query error: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if conn:
            if from_pool and pool:
                try:
                    pool.putconn(conn, close=is_broken)
                except Exception:
                    try:
                        conn.close()
                    except Exception:
                        pass
            else:
                try:
                    if not conn.closed:
                        conn.close()
                except Exception:
                    pass


_DEFAULT_FALLBACK_SERVICES = [
    {"id": "s1", "name": "Corte Signature", "description": "Lavado, corte personalizado y brushing", "price": 25000, "duration": 45, "category": "cabello"},
    {"id": "s2", "name": "Corte Hombre Premium", "description": "Corte masculino de precisión con toalla caliente", "price": 15000, "duration": 30, "category": "cabello"},
    {"id": "s3", "name": "Uñas Gel Luxury", "description": "Esmaltado en gel con diseño artístico", "price": 28000, "duration": 75, "category": "unas"},
    {"id": "s4", "name": "Esmaltado Semi Pro", "description": "Esmaltado semipermanente profesional", "price": 18000, "duration": 45, "category": "unas"},
    {"id": "s5", "name": "Facial Glow", "description": "Limpieza profunda, exfoliación y ácido hialurónico", "price": 35000, "duration": 60, "category": "facial"},
    {"id": "s6", "name": "Tratamiento Anti-frizz Keratina", "description": "Alisado con keratina brasileña premium", "price": 45000, "duration": 120, "category": "tratamientos"},
]


def get_services() -> list[dict]:
    """Fetch all active services from the database with fast in-memory cache and static fallback."""
    global _services_cache, _services_cache_time
    import time
    now = time.time()
    if _services_cache and (now - _services_cache_time) < _CACHE_TTL:
        return _services_cache

    try:
        with get_db_connection() as conn:
            if not conn:
                return _services_cache or _DEFAULT_FALLBACK_SERVICES
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, description, price, duration, category "
                    'FROM services WHERE active = true ORDER BY "order" ASC'
                )
                services = [dict(row) for row in cur.fetchall()]
                if services:
                    _services_cache = services
                    _services_cache_time = now
                    return services
                return _services_cache or _DEFAULT_FALLBACK_SERVICES
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        return _services_cache or _DEFAULT_FALLBACK_SERVICES


def get_service_by_name(name: str) -> Optional[dict]:
    """Find a service by partial name match using cache first."""
    if not name:
        return None
    name_clean = name.lower().strip()
    
    # 1. Check memory cache first (0ms)
    services = get_services()
    for s in services:
        if name_clean in s["name"].lower() or s["name"].lower() in name_clean:
            return s

    # 2. Database query fallback
    try:
        with get_db_connection() as conn:
            if not conn:
                return None
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, description, price, duration, category "
                    "FROM services WHERE active = true AND LOWER(name) LIKE %s LIMIT 1",
                    (f"%{name_clean}%",),
                )
                row = cur.fetchone()
                return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error finding service by name: {e}")
        return None


def get_service_by_index(index: int) -> Optional[dict]:
    """Get a service by its display order (1-based index) using cache first."""
    if index <= 0:
        return None

    # 1. Check memory cache first (0ms)
    services = get_services()
    if services and 1 <= index <= len(services):
        return services[index - 1]

    # 2. Database query fallback
    try:
        with get_db_connection() as conn:
            if not conn:
                return None
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, name, description, price, duration, category '
                    'FROM services WHERE active = true ORDER BY "order" ASC '
                    "LIMIT 1 OFFSET %s",
                    (index - 1,),
                )
                row = cur.fetchone()
                return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error getting service by index: {e}")
        return None


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


def get_customer_history(phone: str) -> list[dict]:
    """Fetch the last 10 appointments for a customer by phone number.
    Used for personalized recommendations."""
    if not phone or len(phone) < 6:
        return []
    try:
        # Use last 8 digits for flexible matching
        phone_suffix = phone[-8:] if len(phone) >= 8 else phone
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT a.date, a.status, s.name as service_name,
                           s.id as service_id, s.duration, s.price, s.category
                    FROM appointments a
                    JOIN services s ON a.service_id = s.id
                    JOIN customers c ON a.customer_id = c.id
                    WHERE (c.phone LIKE %s)
                      AND a.status IN ('COMPLETED', 'CONFIRMED', 'PENDING')
                    ORDER BY a.date DESC
                    LIMIT 10
                """, (f"%{phone_suffix}%",))
                return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.warning(f"Error fetching customer history: {e}")
        return []


_gallery_cache: dict[str, dict] = {}


def get_gallery_image_for_category(category: str) -> Optional[dict]:
    """Get a gallery image URL for a service category with fast in-memory cache.
    Used to send portfolio photos when a service is selected."""
    if not category:
        return None
    cat_key = category.lower().strip()
    if cat_key in _gallery_cache:
        return _gallery_cache[cat_key]

    try:
        with get_db_connection() as conn:
            if not conn:
                return None
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT url, alt FROM gallery_images '
                    'WHERE active = true AND LOWER(category) = %s '
                    'ORDER BY "order" ASC LIMIT 1',
                    (cat_key,)
                )
                row = cur.fetchone()
                if row:
                    data = dict(row)
                    _gallery_cache[cat_key] = data
                    return data
                return None
    except Exception as e:
        logger.warning(f"Error fetching gallery image: {e}")
        return None


def get_customer_preferences(phone: str) -> Optional[dict]:
    """Retrieve semantic memory and preferences for a customer by phone number."""
    if not phone or len(phone) < 6:
        return None
    try:
        phone_suffix = phone[-8:] if len(phone) >= 8 else phone
        with get_db_connection() as conn:
            if not conn:
                return None
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT preferences, name, notes FROM customers WHERE phone LIKE %s LIMIT 1",
                    (f"%{phone_suffix}%",)
                )
                row = cur.fetchone()
                if row and row.get("preferences"):
                    val = row["preferences"]
                    return json.loads(val) if isinstance(val, str) else val
                return None
    except Exception as e:
        logger.warning(f"Error reading customer preferences: {e}")
        return None


def update_customer_preferences(phone: str, preferences: dict) -> bool:
    """Update semantic memory and preferences for a customer by phone number."""
    if not phone or not preferences:
        return False
    try:
        phone_suffix = phone[-8:] if len(phone) >= 8 else phone
        with get_db_connection() as conn:
            if not conn:
                return False
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE customers SET preferences = %s, updated_at = NOW() WHERE phone LIKE %s",
                    (json.dumps(preferences), f"%{phone_suffix}%")
                )
                conn.commit()
                return True
    except Exception as e:
        logger.warning(f"Error updating customer preferences: {e}")
        return False

