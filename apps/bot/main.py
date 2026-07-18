# ============================================
# Glow Studio by Sofia — FastAPI Application
# ============================================

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../../.env")
load_dotenv(dotenv_path="../../.env.local")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import MessageRequest, MessageResponse
from agent import process_message

app = FastAPI(
    title="Glow Studio AI Agent",
    description="Motor de IA para el chatbot de Glow Studio by Sofia",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "glow-studio-bot", "model": "gemini-2.0-flash"}


@app.get("/debug-agent")
async def debug_agent():
    import os
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    groq_keys = [k.strip() for k in (groq_key or "").split(",") if k.strip()]
    groq_prefix = groq_keys[0][:10] if groq_keys else "None"
    gemini_prefix = gemini_key[:10] if gemini_key else "None"
    
    groq_test_result = "Not tested"
    key_to_use = groq_keys[0] if groq_keys else gemini_key
    if key_to_use:
        try:
            from groq import Groq
            client = Groq(api_key=key_to_use)
            comp = client.chat.completions.create(
                messages=[{"role": "user", "content": "Hola"}],
                model="llama-3.1-8b-instant"
            )
            groq_test_result = f"Success: {comp.choices[0].message.content[:50]}"
        except Exception as e:
            groq_test_result = f"Failed: {str(e)}"
            
    return {
        "groq_key_prefix": groq_prefix,
        "gemini_key_prefix": gemini_prefix,
        "groq_test_result": groq_test_result,
        "groq_key_raw_length": len(groq_key) if groq_key else 0,
        "groq_keys_count": len(groq_keys),
        "has_groq_key": groq_key is not None,
        "has_gemini_key": gemini_key is not None,
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
    conversations.pop(sender_id, None)
    return {"status": "ok", "message": f"Conversation reset for {sender_id}"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BOT_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
