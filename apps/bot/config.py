# ============================================
# Glow Studio by Sofia — Bot Centralized Config
# ============================================

import os
from dotenv import load_dotenv

load_dotenv()

# Environment
IS_PROD = os.getenv("NODE_ENV") == "production" or os.getenv("RENDER") == "true"
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() in ("true", "1", "yes")
PORT = int(os.getenv("PORT", os.getenv("BOT_PORT", "8000")))

# Core Services
API_URL = os.getenv(
    "API_URL",
    "https://glow-studio-api-2vzt.onrender.com" if IS_PROD else "http://localhost:3001"
)
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://glow-studio-web.onrender.com" if IS_PROD else "http://localhost:3000"
)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "")

# AI / LLM (Groq)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# WhatsApp & Salon Info
SALON_WHATSAPP = "".join(c for c in os.getenv("SALON_WHATSAPP", "5491178296781") if c.isdigit())
INSTANCE_NAME = os.getenv("INSTANCE_NAME", f"glow-studio-{SALON_WHATSAPP}")
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")
