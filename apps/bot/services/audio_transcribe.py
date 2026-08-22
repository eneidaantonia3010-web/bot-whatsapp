# ============================================
# Audio Transcription Service (Groq Whisper)
# ============================================

import os
from typing import Optional
from groq import Groq


import tempfile
from typing import Optional, Union
from groq import Groq


def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.ogg") -> Optional[str]:
    """Transcribe in-memory audio bytes using Groq Whisper API."""
    if not audio_bytes:
        return None

    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", "").split(",") if k.strip()]
    if not groq_keys:
        return None

    for key in groq_keys:
        try:
            client = Groq(api_key=key)
            transcription = client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3-turbo",
                language="es",
                response_format="text",
            )
            return str(transcription).strip()
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

