# ============================================
# Glow Studio by Sofia — Language Detector
# ============================================

import logging
from typing import Literal

logger = logging.getLogger("glow_bot.language")

LanguageCode = Literal["es", "pt", "en"]

# Common words/phrases for fast detection
_PT_MARKERS = frozenset({
    "olá", "oi", "obrigado", "obrigada", "bom dia", "boa tarde",
    "boa noite", "tudo bem", "quero", "cabelo", "unha", "unhas",
    "corte de cabelo", "manicure", "pedicure", "horário", "agendar",
    "marcar", "reservar horário", "por favor", "muito obrigado",
    "como faço", "gostaria", "preciso", "posso",
})

_EN_MARKERS = frozenset({
    "hello", "hi", "hey", "thanks", "thank you", "appointment",
    "book", "booking", "haircut", "hair", "nails", "facial",
    "schedule", "available", "price", "cost", "how much",
    "i want", "i need", "i would like", "please", "good morning",
    "good afternoon", "can i", "could i",
})


def detect_language(text: str) -> LanguageCode:
    """Detect the language of a message.
    
    Fast keyword-based detection with high accuracy for the 3 target languages.
    Returns 'es' (Spanish/default), 'pt' (Portuguese), or 'en' (English).
    """
    lower = text.lower().strip()
    words = set(lower.split())
    
    # Check bigrams too for phrases like "bom dia", "how much"
    bigrams = set()
    word_list = lower.split()
    for i in range(len(word_list) - 1):
        bigrams.add(f"{word_list[i]} {word_list[i+1]}")
    
    all_tokens = words | bigrams
    
    pt_score = len(all_tokens & _PT_MARKERS)
    en_score = len(all_tokens & _EN_MARKERS)
    
    if pt_score > 0 and pt_score >= en_score:
        logger.info(f"Language detected: Portuguese (score={pt_score})")
        return "pt"
    if en_score > 0 and en_score > pt_score:
        logger.info(f"Language detected: English (score={en_score})")
        return "en"
    
    return "es"  # Default: Spanish


# i18n templates for static bot responses
I18N = {
    "es": {
        "greeting": "¡Hola! Bienvenida a *Glow Studio by Sofia* ✨",
        "select_service": "Escribí el número o nombre del servicio que te interesa 😊",
        "ask_date": "¿Qué día y horario te gustaría? (Ej: martes 14hs) 📅",
        "ask_name": "Para completar tu reserva, ¿cuál es tu *nombre completo*? 📝",
        "ask_phone": "Por último, ¿cuál es tu número de teléfono o WhatsApp con código de país? 📱",
        "confirm_prompt": "¿Confirmamos? Escribí *sí* para confirmar o *no* para cambiar algo 😊",
        "booking_confirmed": "🎉 *¡Turno confirmado!*",
        "booking_error": "😔 Hubo un problema al reservar. Por favor, intentá de nuevo.",
        "human_escalation": "Te paso con Sofía, ella te va a atender en un momentito 💕 Mientras tanto, ¿hay algo más en lo que pueda ayudarte?",
        "human_notified": "✅ Ya le avisamos a Sofía. Te va a contactar a la brevedad.",
        "welcome_back": "¡Hola de nuevo! 💕 Habíamos quedado con tu turno de *{service}*. ¿Seguimos? 😊",
        "session_expired": "¡Hola de nuevo! 💕 Tu sesión anterior expiró. ¿En qué te puedo ayudar hoy? ✨",
        "recommendation": "💡 La última vez te hiciste *{service}* hace {days} días. ¿Te gustaría renovarlo? 😊",
        "multi_service_summary": "Serían *{count} servicios* en total:\n{details}\n\n💰 *Total: {price}* | ⏱️ *Duración: {duration}*",
        "time_conflict": "⚠️ El horario de las *{time}* para el *{date}* ya se encuentra ocupado. 😔\n\n¿Te gustaría elegir otro horario?",
    },
    "pt": {
        "greeting": "Olá! Bem-vinda ao *Glow Studio by Sofia* ✨",
        "select_service": "Escreva o número ou nome do serviço que te interessa 😊",
        "ask_date": "Qual dia e horário você gostaria? (Ex: terça 14h) 📅",
        "ask_name": "Para completar sua reserva, qual é seu *nome completo*? 📝",
        "ask_phone": "Por último, qual é seu número de telefone ou WhatsApp com código do país? 📱",
        "confirm_prompt": "Confirmamos? Escreva *sim* para confirmar ou *não* para mudar algo 😊",
        "booking_confirmed": "🎉 *Agendamento confirmado!*",
        "booking_error": "😔 Houve um problema ao reservar. Por favor, tente novamente.",
        "human_escalation": "Vou te passar para a Sofia, ela vai te atender em um minutinho 💕",
        "human_notified": "✅ Já avisamos a Sofia. Ela vai te contatar em breve.",
        "welcome_back": "Olá de novo! 💕 Estávamos com seu agendamento de *{service}*. Continuamos? 😊",
        "session_expired": "Olá de novo! 💕 Sua sessão anterior expirou. Em que posso ajudar hoje? ✨",
        "recommendation": "💡 Da última vez você fez *{service}* há {days} dias. Gostaria de renovar? 😊",
        "multi_service_summary": "Seriam *{count} serviços* no total:\n{details}\n\n💰 *Total: {price}* | ⏱️ *Duração: {duration}*",
        "time_conflict": "⚠️ O horário das *{time}* para o dia *{date}* já está ocupado. 😔\n\nGostaria de escolher outro horário?",
    },
    "en": {
        "greeting": "Hello! Welcome to *Glow Studio by Sofia* ✨",
        "select_service": "Type the number or name of the service you're interested in 😊",
        "ask_date": "What day and time would you like? (e.g., Tuesday 2pm) 📅",
        "ask_name": "To complete your booking, what's your *full name*? 📝",
        "ask_phone": "Lastly, what's your phone number or WhatsApp with country code? 📱",
        "confirm_prompt": "Shall we confirm? Type *yes* to confirm or *no* to change something 😊",
        "booking_confirmed": "🎉 *Appointment confirmed!*",
        "booking_error": "😔 There was a problem booking. Please try again.",
        "human_escalation": "Let me connect you with Sofia, she'll assist you shortly 💕",
        "human_notified": "✅ Sofia has been notified. She'll contact you soon.",
        "welcome_back": "Welcome back! 💕 We were working on your *{service}* appointment. Shall we continue? 😊",
        "session_expired": "Welcome back! 💕 Your previous session expired. How can I help you today? ✨",
        "recommendation": "💡 Last time you had *{service}* {days} days ago. Would you like to book it again? 😊",
        "multi_service_summary": "That would be *{count} services* in total:\n{details}\n\n💰 *Total: {price}* | ⏱️ *Duration: {duration}*",
        "time_conflict": "⚠️ The *{time}* slot on *{date}* is already taken. 😔\n\nWould you like to choose another time?",
    },
}


def t(key: str, lang: LanguageCode = "es", **kwargs) -> str:
    """Get a translated string. Falls back to Spanish if key not found."""
    template = I18N.get(lang, I18N["es"]).get(key, I18N["es"].get(key, key))
    if kwargs:
        try:
            return template.format(**kwargs)
        except (KeyError, IndexError):
            return template
    return template
