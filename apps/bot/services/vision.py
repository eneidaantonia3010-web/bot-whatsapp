# ============================================
# Glow Studio by Sofia — Vision Analysis Service (Groq)
# ============================================

import os
import base64
import logging
from typing import Optional
from groq import Groq

logger = logging.getLogger("glow_bot.vision")


def analyze_image(image_base64: str, caption: str = "") -> Optional[str]:
    """Use Groq's Llama 3.2 Vision to interpret a customer's image.
    
    Common use cases:
    - Customer sends a reference photo of a hairstyle they want
    - Customer sends a photo of their nails for inspiration
    - Customer sends a photo asking 'can you do something like this?'
    
    Returns a brief Spanish description of what the image shows,
    relevant to beauty salon services.
    """
    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", "").split(",") if k.strip()]
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

    for key in groq_keys:
        try:
            client = Groq(api_key=key)
            completion = client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.5,
                max_tokens=300,
            )
            result = completion.choices[0].message.content
            if result:
                logger.info(f"Vision analysis result: {result[:80]}...")
                return result.strip()
        except Exception as e:
            logger.warning(f"Vision analysis failed with key: {e}")
            continue

    return None
