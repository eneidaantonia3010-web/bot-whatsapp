# ============================================
# Glow Studio by Sofia — Vision Analysis Service (Groq)
# ============================================

import os
import base64
import logging
from typing import Optional
from groq import Groq

try:
    from config import GROQ_API_KEY, GROQ_VISION_MODEL
except ImportError:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "llama-3.2-11b-vision-preview")

logger = logging.getLogger("glow_bot.vision")


def analyze_image(image_base64: str, caption: str = "") -> Optional[str]:
    """Use Groq Vision to interpret a customer's image with key and model fallback."""
    raw_keys = GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    groq_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
    if not groq_keys:
        logger.warning("No GROQ_API_KEY configured for vision")
        return None

    system_prompt = (
        "Eres la asistente virtual de un salón de belleza (Glow Studio by Sofia). "
        "Una clienta te envió una imagen. Describí brevemente qué ves en la imagen "
        "en relación a servicios de belleza (peinado, corte, color, uñas, facial, etc.). "
        "Si es una referencia de estilo, mencioná el tipo de servicio que necesitaría. "
        "Respondé en español argentino, máximo 2-3 líneas. "
        "Si la imagen no tiene nada que ver con belleza, decilo amablemente."
    )

    user_content = []
    if caption:
        user_content.append({"type": "text", "text": f"La clienta escribió: '{caption}'"})
    user_content.append({
        "type": "image_url",
        "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
    })

    vision_models = [GROQ_VISION_MODEL, "llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
    # De-duplicate while preserving order
    seen = set()
    models_to_try = [m for m in vision_models if m and not (m in seen or seen.add(m))]

    for model_name in models_to_try:
        for key in groq_keys:
            try:
                client = Groq(api_key=key)
                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.5,
                    max_tokens=300,
                )
                result = completion.choices[0].message.content
                if result:
                    logger.info(f"Vision analysis result ({model_name}): {result[:80]}...")
                    return result.strip()
            except Exception as e:
                logger.warning(f"Vision analysis failed with key ({model_name}): {e}")
                continue

    return None
