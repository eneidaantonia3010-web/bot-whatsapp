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

    digits = "".join(filter(str.isdigit, phone_str))
    if not digits:
        return None

    if len(digits) == 10 and digits.startswith("11"):
        return "549" + digits

    if digits.startswith("549") and len(digits) >= 12:
        return digits

    if digits.startswith("54") and len(digits) == 12 and digits[2:4] == "11":
        return "549" + digits[2:]

    cleaned = phone_str.strip()
    if not cleaned.startswith("+") and not cleaned.startswith("54"):
        cleaned = f"+54{cleaned}"
    elif not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"

    try:
        parsed = phonenumbers.parse(cleaned, default_region)
        if phonenumbers.is_valid_number(parsed):
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            res = formatted.replace("+", "")
            if res.startswith("54") and len(res) == 12 and res[2:4] == "11":
                return "549" + res[2:]
            return res
    except Exception:
        pass

    if len(digits) >= 8:
        if digits.startswith("54"):
            return digits
        return "54" + digits

    return None
