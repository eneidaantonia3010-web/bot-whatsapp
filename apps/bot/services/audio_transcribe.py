# ============================================
# Audio Transcription Service (Groq Whisper)
# ============================================

import os
import asyncio
import logging
from typing import Optional, Union
from groq import Groq

try:
    from config import GROQ_API_KEY
except ImportError:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

logger = logging.getLogger("glow_bot.audio")


WHISPER_HALLUCINATIONS = frozenset({
    "subtítulos por la comunidad de amara.org",
    "subtitulos por la comunidad de amara.org",
    "muchas gracias por ver el video",
    "suscríbete al canal",
    "suscribete al canal",
    "gracias por ver",
    "mbc",
    "you",
    "...",
})


def _detect_audio_extension(audio_bytes: bytes) -> str:
    """Detect audio container format from magic bytes."""
    if len(audio_bytes) < 12:
        return "audio.ogg"
    header = audio_bytes[:12]
    if header.startswith(b"OggS"):
        return "audio.ogg"
    if header.startswith(b"RIFF") and header[8:12] == b"WAVE":
        return "audio.wav"
    if header.startswith(b"ID3") or header[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio.mp3"
    if header[4:8] in (b"ftyp", b"moov"):
        return "audio.m4a"
    return "audio.ogg"


_audio_clients: dict[str, Groq] = {}


def _get_audio_client(key: str) -> Groq:
    if key not in _audio_clients:
        _audio_clients[key] = Groq(api_key=key)
    return _audio_clients[key]


def transcribe_audio_bytes(audio_bytes: bytes, filename: Optional[str] = None) -> Optional[str]:
    """Transcribe in-memory audio bytes using Groq Whisper API with dynamic format detection."""
    if not audio_bytes or len(audio_bytes) < 150:
        return None

    actual_filename = filename or _detect_audio_extension(audio_bytes)

    raw_keys = GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    groq_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
    if not groq_keys:
        return None

    for key in groq_keys:
        try:
            client = _get_audio_client(key)
            transcription = client.audio.transcriptions.create(
                file=(actual_filename, audio_bytes),
                model="whisper-large-v3-turbo",
                language="es",
                response_format="text",
                temperature=0.0,
            )
            text = str(transcription).strip()
            if text.lower() in WHISPER_HALLUCINATIONS or len(text) < 2:
                return None
            return text
        except Exception as e:
            print(f"⚠️ Audio transcription warning with key: {e}")
            continue

    return None


def transcribe_audio_file(file_path_or_bytes: Union[str, bytes]) -> Optional[str]:
    """Transcribe audio from a file path or bytes using Groq Whisper API."""
    if isinstance(file_path_or_bytes, bytes):
        return transcribe_audio_bytes(file_path_or_bytes)

    if not os.path.exists(file_path_or_bytes):
        return None

    try:
        with open(file_path_or_bytes, "rb") as f:
            data = f.read()
        return transcribe_audio_bytes(data, filename=os.path.basename(file_path_or_bytes))
    except Exception as e:
        print(f"⚠️ Error reading audio file {file_path_or_bytes}: {e}")
        return None


async def transcribe_audio_bytes_async(audio_bytes: bytes, filename: Optional[str] = None) -> Optional[str]:
    """Asynchronously transcribe audio bytes using Groq Whisper without blocking the event loop."""
    return await asyncio.to_thread(transcribe_audio_bytes, audio_bytes, filename=filename)


