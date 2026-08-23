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

try:
    from config import FRONTEND_URL, DEBUG_MODE, PORT, GROQ_API_KEY
except ImportError:
    FRONTEND_URL = os.getenv("FRONTEND_URL", "")
    DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
    PORT = int(os.getenv("PORT", os.getenv("BOT_PORT", "8000")))
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

from models import MessageRequest, MessageResponse
from agent import process_message

app = FastAPI(
    title="Glow Studio AI Agent",
    description="Motor de IA para el chatbot de Glow Studio by Sofia",
    version="1.0.0",
)

# CORS Configuration
cors_origins_raw = os.getenv("CORS_ORIGINS", FRONTEND_URL)
allowed_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

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
    if not DEBUG_MODE:
        return {"error": "Debug endpoint disabled in production. Set DEBUG_MODE=true to enable."}

    groq_keys = [k.strip() for k in (GROQ_API_KEY or "").split(",") if k.strip()]

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
    result = await process_message(
        sender_id=request.sender_id,
        message=request.message,
        platform=request.platform.value,
    )

    # Agent can return a string or a dict with response + image_url
    if isinstance(result, dict):
        return MessageResponse(
            response=result.get("response", ""),
            image_url=result.get("image_url"),
        )
    return MessageResponse(response=result)


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



@app.post("/analyze-image")
async def analyze_image_endpoint(request: Request):
    """
    Receive an image (base64) from WhatsApp, analyze it with Groq Vision,
    and return an interpreted text description for the bot pipeline.
    """
    from services.vision import analyze_image

    try:
        data = await request.json()
        image_base64 = data.get("image_base64", "")
        sender_id = data.get("sender_id", "")
        caption = data.get("caption", "")

        if not image_base64:
            return {"interpreted_text": None, "status": "error", "error": "No image data"}

        interpreted = analyze_image(image_base64, caption=caption)

        if interpreted:
            # Combine caption with vision interpretation for the bot
            if caption:
                combined = f"[Imagen: {interpreted}] {caption}"
            else:
                combined = f"[La clienta envió una imagen: {interpreted}]"
            return {"interpreted_text": combined, "status": "ok"}
        else:
            return {"interpreted_text": caption or None, "status": "no_vision"}
    except Exception as e:
        return {"interpreted_text": None, "status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BOT_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

