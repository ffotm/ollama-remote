"""
Thin async wrappers around the Ollama /api/chat endpoint.

  - stream_ollama()  — async generator that yields SSE-formatted data lines,
                       suitable for returning directly in a StreamingResponse.
  - call_ollama()    — collects the full response text (used for sub-calls
                       during multi-chunk log analysis).
"""

import json
from typing import AsyncIterator

import httpx

from config import CF_HEADERS


async def stream_ollama(
    base: str,
    model: str,
    system: str,
    messages: list[dict],
    timeout: int = 120,
) -> AsyncIterator[str]:
    """
    Yield raw SSE lines (`data: {...}\\n\\n`) from Ollama's streaming endpoint.
    Yields a final `data: [DONE]\\n\\n` when finished.
    """
    try:
        async with httpx.AsyncClient(timeout=timeout, headers=CF_HEADERS) as client:
            async with client.stream(
                "POST",
                f"{base}/api/chat",
                json={
                    "model": model,
                    "stream": True,
                    "system": system,
                    "messages": messages,
                },
            ) as res:
                async for line in res.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("message", {}).get("content", "")
                        yield f"data: {json.dumps({'token': token})}\n\n"
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        yield "data: [DONE]\n\n"


async def call_ollama(
    base: str,
    model: str,
    system: str,
    messages: list[dict],
    timeout: int = 180,
) -> str:
    """
    Fire a single Ollama request and return the complete response as a string.
    Used for sequential sub-calls (e.g. per-chunk log analysis) where the
    caller needs the full text before proceeding.
    """
    full = ""
    try:
        async with httpx.AsyncClient(timeout=timeout, headers=CF_HEADERS) as client:
            async with client.stream(
                "POST",
                f"{base}/api/chat",
                json={
                    "model": model,
                    "stream": True,
                    "system": system,
                    "messages": messages,
                },
            ) as res:
                async for line in res.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        full += data.get("message", {}).get("content", "")
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        full = f"[Error during Ollama call: {e}]"
    return full