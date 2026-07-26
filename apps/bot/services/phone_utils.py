# ============================================
# Phone Number Parsing & Formatting Utility
# ============================================

import phonenumbers
from typing import Optional


def normalize_phone(phone_str: str, default_region: str = "AR") -> Optional[str]:
    """
    Parse and format a phone number string into E.164 without leading '+'.
    Defaults to Argentina (AR).
    """
    if not phone_str:
        return None

    cleaned = phone_str.strip()
    if not cleaned.startswith("+") and not cleaned.startswith("54"):
        cleaned = f"+54{cleaned}"
    elif not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"

    try:
        parsed = phonenumbers.parse(cleaned, default_region)
        if phonenumbers.is_valid_number(parsed):
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            return formatted.replace("+", "")
    except Exception as e:
        print(f"⚠️ Phone parsing warning for '{phone_str}': {e}")

    # Fallback digit extraction
    digits = "".join(filter(str.isdigit, phone_str))
    if len(digits) >= 8:
        if digits.startswith("549"):
            return "54" + digits[3:]
        elif not digits.startswith("54"):
            return "54" + digits
        return digits

    return None
