# ============================================
# Groq Async Client Pooler (improved with retry/backoff)
# ============================================

import os
import time
import random
import logging
from typing import Optional

from groq import Groq
from groq.types import ChatCompletion

logger = logging.getLogger("glow_bot.llm_pool")


class LLMPool:
    """Pooler for Groq API clients supporting key rotation and automatic failover
    with exponential backoff retry."""

    def __init__(self):
        self._clients: list[Groq] = []
        self._reload_keys()

    def _reload_keys(self):
        raw = os.getenv("GROQ_API_KEY", "")
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        self._clients = [Groq(api_key=k) for k in keys]
        logger.info(f"LLM pool initialized with {len(self._clients)} client(s)")

    def get_completion(
        self,
        messages: list[dict],
        model: str = "llama-3.1-8b-instant",
        system_msg: Optional[str] = None,
        max_retries: int = 2,
        temperature: float = 0.7,
        timeout_sec: int = 30,
    ) -> Optional[str]:
        """Execute chat completion with automatic failover between available Groq keys
        and exponential backoff retry on transient errors."""
        if not self._clients:
            self._reload_keys()

        if not self._clients:
            logger.warning("⚠️ No GROQ_API_KEY configured.")
            return None

        formatted_messages = []
        if system_msg:
            formatted_messages.append({"role": "system", "content": system_msg})
        formatted_messages.extend(messages)

        # Round-robin through clients for load distribution
        total_clients = len(self._clients)
        last_error = None

        for attempt in range(1 + max_retries):
            client_idx = (attempt) % total_clients
            client = self._clients[client_idx]

            try:
                completion: ChatCompletion = client.chat.completions.create(
                    messages=formatted_messages,
                    model=model,
                    temperature=temperature,
                    timeout=timeout_sec,
                )
                content = completion.choices[0].message.content
                if content:
                    return content
                logger.warning(f"Empty completion from client {client_idx}, attempt {attempt + 1}")
            except Exception as e:
                last_error = e
                logger.warning(f"Groq API call failed on client {client_idx}, attempt {attempt + 1}: {e}")

                # Don't retry on apparent auth/validation errors
                error_str = str(e).lower()
                if any(keyword in error_str for keyword in (
                    "authentication_error", "api_key", "invalid_api_key",
                    "rate_limit_exceeded", "content_filter",
                )):
                    logger.warning(f"Non-transient error, skipping retry: {e}")
                    continue

                # Exponential backoff before retrying
                if attempt < max_retries:
                    backoff = min(2 ** attempt, 16) + random.uniform(0, 1)
                    logger.info(f"Retrying in {backoff:.1f}s...")
                    time.sleep(backoff)

        if last_error:
            logger.error(f"LLM pool exhausted all clients and retries: {last_error}")
        return None


# Global singleton pool
llm_pool = LLMPool()
