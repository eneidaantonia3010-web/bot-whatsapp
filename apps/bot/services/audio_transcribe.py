# ============================================
# Audio Transcription Service (Groq Whisper)
# ============================================

import os
from typing import Optional
from groq import Groq


def transcribe_audio_file(file_path_or_bytes: str) -> Optional[str]:
    """Transcribe audio using Groq Whisper API."""
    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", "").split(",") if k.strip()]

    if not groq_keys:
        return None

    for key in groq_keys:
        try:
            client = Groq(api_key=key)
            with open(file_path_or_bytes, "rb") as file:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(file_path_or_bytes), file.read()),
                    model="whisper-large-v3-turbo",
                    language="es",
                    response_format="text",
                )
                return str(transcription).strip()
        except Exception as e:
            print(f"⚠️ Audio transcription warning with key: {e}")
            continue

    return None
