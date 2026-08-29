# ============================================
# Groq Async Client Pooler with Fallback and Retry
# ============================================

import os
import asyncio
import logging
from typing import Optional, Any

from groq import AsyncGroq, Groq

try:
    from config import GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL
except ImportError:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "llama-3.1-8b-instant")

logger = logging.getLogger("glow_bot.llm_pool")


def normalize_history_for_groq(history: list[dict]) -> list[dict]:
    """Convert custom internal chat history format into standard OpenAI/Groq message objects."""
    normalized = []
    for turn in history:
        role = turn.get("role", "user")
        if role == "model":
            role = "assistant"
        
        content = ""
        if "parts" in turn and isinstance(turn["parts"], list) and len(turn["parts"]) > 0:
            content = str(turn["parts"][0])
        elif "content" in turn:
            content = str(turn["content"])
        
        if content:
            normalized.append({"role": role, "content": content})
    return normalized


class LLMPool:
    """Pooler for Groq API clients supporting key rotation, AsyncGroq, model fallback
    and fast failover."""

    def __init__(self):
        self._async_clients: list[AsyncGroq] = []
        self._sync_clients: list[Groq] = []
        self._reload_keys()

    def _reload_keys(self):
        raw = GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        self._async_clients = [AsyncGroq(api_key=k) for k in keys]
        self._sync_clients = [Groq(api_key=k) for k in keys]
        logger.info(f"LLM pool initialized with {len(self._async_clients)} Groq client(s)")

    async def get_completion_async(
        self,
        messages: list[dict] = None,
        model: Optional[str] = None,
        system_msg: Optional[str] = None,
        max_retries: int = 2,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout_sec: int = 10,
    ) -> Optional[str]:
        """Asynchronously execute chat completion with key rotation and model fallback."""
        if not self._async_clients:
            self._reload_keys()

        if not self._async_clients:
            logger.warning("⚠️ No GROQ_API_KEY configured.")
            return None

        target_model = model or GROQ_MODEL or "llama-3.3-70b-versatile"
        fallback_model = GROQ_FALLBACK_MODEL or "llama-3.1-8b-instant"

        # Format input messages
        formatted_messages = []
        if system_msg:
            formatted_messages.append({"role": "system", "content": system_msg})
        
        if messages:
            formatted_messages.extend(normalize_history_for_groq(messages))

        total_clients = len(self._async_clients)
        models_to_try = [target_model]
        if fallback_model and fallback_model != target_model:
            models_to_try.append(fallback_model)

        for current_model in models_to_try:
            for attempt in range(1 + max_retries):
                client_idx = attempt % total_clients
                client = self._async_clients[client_idx]

                try:
                    kwargs: dict[str, Any] = {
                        "messages": formatted_messages,
                        "model": current_model,
                        "temperature": temperature,
                        "timeout": timeout_sec,
                    }
                    if max_tokens:
                        kwargs["max_tokens"] = max_tokens

                    completion = await client.chat.completions.create(**kwargs)
                    content = completion.choices[0].message.content
                    if content and content.strip():
                        return content.strip()
                except Exception as e:
                    logger.warning(f"AsyncGroq call failed (client {client_idx}, model {current_model}): {e}")
                    if attempt < max_retries:
                        await asyncio.sleep(0.1)

        logger.error("LLM pool exhausted all async clients and model fallbacks.")
        return None

    def get_completion(
        self,
        messages: list[dict] = None,
        model: Optional[str] = None,
        system_msg: Optional[str] = None,
        max_retries: int = 1,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout_sec: int = 8,
    ) -> Optional[str]:
        """Synchronous wrapper for backwards compatibility."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If already in an async event loop, run sync client directly
                return self._get_completion_sync(
                    messages=messages,
                    model=model,
                    system_msg=system_msg,
                    max_retries=max_retries,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout_sec=timeout_sec,
                )
            return loop.run_until_complete(
                self.get_completion_async(
                    messages=messages,
                    model=model,
                    system_msg=system_msg,
                    max_retries=max_retries,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout_sec=timeout_sec,
                )
            )
        except Exception:
            return self._get_completion_sync(
                messages=messages,
                model=model,
                system_msg=system_msg,
                max_retries=max_retries,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout_sec=timeout_sec,
            )

    def _get_completion_sync(
        self,
        messages: list[dict] = None,
        model: Optional[str] = None,
        system_msg: Optional[str] = None,
        max_retries: int = 1,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout_sec: int = 8,
    ) -> Optional[str]:
        if not self._sync_clients:
            self._reload_keys()
        if not self._sync_clients:
            return None

        target_model = model or GROQ_MODEL or "llama-3.3-70b-versatile"
        formatted_messages = []
        if system_msg:
            formatted_messages.append({"role": "system", "content": system_msg})
        if messages:
            formatted_messages.extend(normalize_history_for_groq(messages))

        total_clients = len(self._sync_clients)
        for attempt in range(1 + max_retries):
            client_idx = attempt % total_clients
            client = self._sync_clients[client_idx]
            try:
                kwargs: dict[str, Any] = {
                    "messages": formatted_messages,
                    "model": target_model,
                    "temperature": temperature,
                    "timeout": timeout_sec,
                }
                if max_tokens:
                    kwargs["max_tokens"] = max_tokens
                completion = client.chat.completions.create(**kwargs)
                content = completion.choices[0].message.content
                if content and content.strip():
                    return content.strip()
            except Exception as e:
                logger.warning(f"Sync Groq call failed on client {client_idx}: {e}")
        return None


# Global singleton pool
llm_pool = LLMPool()
