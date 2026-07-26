# ============================================
# Groq Async Client Pooler
# ============================================

import os
from typing import Optional
from groq import Groq


class LLMPool:
    """Pooler for Groq API clients supporting key rotation and automatic failover."""

    def __init__(self):
        self._keys = []
        self._reload_keys()

    def _reload_keys(self):
        raw = os.getenv("GROQ_API_KEY", "")
        self._keys = [k.strip() for k in raw.split(",") if k.strip()]

    def get_completion(
        self,
        messages: list[dict],
        model: str = "llama-3.1-8b-instant",
        system_msg: Optional[str] = None,
    ) -> Optional[str]:
        """Execute chat completion with automatic failover between available Groq keys."""
        if not self._keys:
            self._reload_keys()

        if not self._keys:
            print("⚠️ No GROQ_API_KEY configured.")
            return None

        formatted_messages = []
        if system_msg:
            formatted_messages.append({"role": "system", "content": system_msg})
        formatted_messages.extend(messages)

        for key in self._keys:
            try:
                client = Groq(api_key=key)
                completion = client.chat.completions.create(
                    messages=formatted_messages,
                    model=model,
                )
                return completion.choices[0].message.content
            except Exception as e:
                print(f"⚠️ Groq API key failed, trying next: {e}")
                continue

        return None


# Global singleton pool
llm_pool = LLMPool()
