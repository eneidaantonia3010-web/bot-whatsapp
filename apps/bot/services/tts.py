# ============================================
# Glow Studio by Sofia — Voice Synthesis Service (TTS)
# ============================================

import os
import io
import logging
from typing import Optional
import httpx

logger = logging.getLogger("glow_bot.tts")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default friendly warm voice / Sofia clone
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def synthesize_voice_note(text: str) -> Optional[bytes]:
    """Synthesize a natural, warm voice note from text for WhatsApp.
    
    Generates audio in MP3/OGG format with voice personality suited for Sofia.
    Falls back gracefully if TTS API keys are not configured.
    """
    if not text or len(text.strip()) == 0:
        return None

    # Clean text of markdown asterisks and heavy formatting before speech
    clean_text = text.replace("*", "").replace("_", "").replace("~", "").replace("`", "")

    # 1. Try ElevenLabs if configured
    if ELEVENLABS_API_KEY:
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
            headers = {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            }
            payload = {
                "text": clean_text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.8,
                    "style": 0.3,
                },
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=15.0)
                if resp.status_code == 200:
                    logger.info(f"ElevenLabs TTS synthesized {len(resp.content)} bytes for: {clean_text[:40]}...")
                    return resp.content
                else:
                    logger.warning(f"ElevenLabs TTS returned {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"ElevenLabs TTS failed: {e}")

    # 2. Try OpenAI TTS if configured
    if OPENAI_API_KEY:
        try:
            url = "https://api.openai.com/v1/audio/speech"
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "tts-1",
                "input": clean_text,
                "voice": "nova",  # Warm feminine voice
                "response_format": "mp3",
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=12.0)
                if resp.status_code == 200:
                    logger.info(f"OpenAI TTS synthesized {len(resp.content)} bytes")
                    return resp.content
        except Exception as e:
            logger.warning(f"OpenAI TTS failed: {e}")

    logger.debug("No TTS API key active; returning None (text-only response)")
    return None
