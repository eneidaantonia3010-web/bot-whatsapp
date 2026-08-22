# ============================================
# Glow Studio by Sofia — FastAPI Application
# ============================================

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../../.env")
load_dotenv(dotenv_path="../../.env.local")

from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware

from models import MessageRequest, MessageResponse
from agent import process_message

app = FastAPI(
    title="Glow Studio AI Agent",
    description="Motor de IA para el chatbot de Glow Studio by Sofia",
    version="1.0.0",
)

# CORS Configuration
cors_origins_raw = os.getenv("CORS_ORIGINS", os.getenv("FRONTEND_URL", ""))
allowed_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.head("/")
async def root():
    """Root endpoint for UptimeRobot and health monitoring."""
    return {"status": "ok", "service": "glow-studio-bot", "model": "groq-llama-3.1-8b-instant"}


@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "glow-studio-bot", "model": "groq-llama-3.1-8b-instant"}



@app.get("/debug-agent")
async def debug_agent():
    # Solo disponible si DEBUG_MODE está habilitado explícitamente
    debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
    if not debug_mode:
        return {"error": "Debug endpoint disabled in production. Set DEBUG_MODE=true to enable."}

    groq_key = os.getenv("GROQ_API_KEY")
    groq_keys = [k.strip() for k in (groq_key or "").split(",") if k.strip()]

    return {
        "has_groq_key": bool(groq_keys),
        "groq_keys_count": len(groq_keys),
    }





@app.post("/process-message", response_model=MessageResponse)
async def handle_message(request: MessageRequest):
    """
    Process an incoming message from any platform (Instagram, WhatsApp, Web).
    The agent will understand the message, track conversation state,
    and return an appropriate response.
    """
    response_text = await process_message(
        sender_id=request.sender_id,
        message=request.message,
        platform=request.platform.value,
    )

    return MessageResponse(response=response_text)


@app.post("/reset-conversation/{sender_id}")
async def reset_conversation(sender_id: str):
    """Reset a conversation state for a specific sender."""
    from agent import conversations
    from services.database import delete_conversation_state
    conversations.pop(sender_id, None)
    delete_conversation_state(sender_id)
    return {"status": "ok", "message": f"Conversation reset for {sender_id}"}


@app.post("/transcribe-audio")
async def transcribe_audio_endpoint(request: Request):
    """
    Receive raw audio bytes or JSON with base64 audio in the request body,
    transcribe with Groq Whisper API, and return the transcribed text.
    """
    import base64
    from services.audio_transcribe import transcribe_audio_bytes

    try:
        content_type = request.headers.get("content-type", "")
        raw_body = await request.body()

        if not raw_body:
            return {"text": None, "status": "error", "error": "No audio data received in body"}

        audio_bytes = raw_body

        # If payload is JSON with base64 audio field
        if "application/json" in content_type:
            try:
                data = await request.json()
                b64_str = data.get("audio") or data.get("audio_base64") or data.get("base64")
                if b64_str:
                    audio_bytes = base64.b64decode(b64_str)
            except Exception:
                pass

        text = transcribe_audio_bytes(audio_bytes, filename="voice_message.ogg")

        if text:
            return {"text": text, "status": "ok"}
        else:
            return {"text": None, "status": "error", "error": "Transcription returned empty result"}
    except Exception as e:
        return {"text": None, "status": "error", "error": str(e)}


@app.post("/transcribe-audio-file")
async def transcribe_audio_file_endpoint(file: UploadFile = File(...)):
    """
    Receive an audio file upload (multipart/form-data),
    transcribe with Groq Whisper, and return text.
    """
    from services.audio_transcribe import transcribe_audio_bytes

    if not file:
        return {"error": "No audio file provided", "text": None}

    try:
        content = await file.read()
        if not content:
            return {"text": None, "status": "error", "error": "Uploaded file is empty"}

        filename = file.filename or "voice_message.ogg"
        text = transcribe_audio_bytes(content, filename=filename)

        if text:
            return {"text": text, "status": "ok"}
        else:
            return {"text": None, "status": "error", "error": "Transcription returned empty result"}
    except Exception as e:
        return {"text": None, "status": "error", "error": str(e)}



if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BOT_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

