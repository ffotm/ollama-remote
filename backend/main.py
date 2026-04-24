import json
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import OLLAMA_BASE_URL, CF_HEADERS, CORS_ORIGINS
from database import init_db, save_message, get_messages, rename_conversation
from ollama import stream_ollama, call_ollama
from prompts import SYSTEM_PROMPTS
from routers import conversations, models, upload
from analyzers.cve import extract_cve_id, fetch_nvd_cve, build_cve_context
from analyzers.log import detect_log_format, chunk_log
from analyzers.code import detect_language, OWASP_TOP10

# ── App setup ────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router)
app.include_router(conversations.router)
app.include_router(upload.router)

init_db()


# ── SSE response headers ─────────────────────────────────
_SSE_HEADERS = {
    "X-Accel-Buffering": "no",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
}


# ── Chat request schema ──────────────────────────────────
class ChatRequest(BaseModel):
    conversation_id: str
    model: str
    message: str
    images: Optional[list[str]] = None
    mode: Optional[str] = "general"  # general | cve | log | codevuln
    ollama_base: Optional[str] = None


# ── /api/chat ────────────────────────────────────────────
@app.post("/api/chat")
async def chat(req: ChatRequest):
    base = req.ollama_base or OLLAMA_BASE_URL

    # Persist user message and auto-title the conversation
    save_message(req.conversation_id, "user", req.message)
    words = req.message.split()[:6]
    auto_title = " ".join(words) + ("…" if len(req.message.split()) > 6 else "")
    rename_conversation(req.conversation_id, auto_title)

    # Build message history
    history = get_messages(req.conversation_id)
    messages = [{"role": m["role"], "content": m["content"]} for m in history]

    # Attach images to the most recent user turn
    if req.images:
        for msg in reversed(messages):
            if msg["role"] == "user":
                msg["images"] = req.images
                break

    system = SYSTEM_PROMPTS.get(req.mode, SYSTEM_PROMPTS["general"])

    # ── CVE mode: inject live NVD data ───────────────────
    if req.mode == "cve":
        cve_id = extract_cve_id(req.message)
        if cve_id:
            cve_data = await fetch_nvd_cve(cve_id)
            for msg in reversed(messages):
                if msg["role"] != "user":
                    continue
                if cve_data:
                    nvd_block = build_cve_context(cve_data)
                    msg["content"] = f"{nvd_block}\n\nUser question: {msg['content']}"
                else:
                    msg["content"] = (
                        f"[NOTE: NVD API returned no data for {cve_id}. "
                        "This may be a very new CVE, a typo, or a reserved ID. "
                        "Tell the user and provide general context only — "
                        "clearly state you have no verified NVD data.]\n\n"
                        + msg["content"]
                    )
                break

    # ── Log mode: detect format, chunk if large ──────────
    elif req.mode == "log":
        log_text = req.message
        log_format = detect_log_format(log_text)
        chunks = chunk_log(log_text)

        if len(chunks) == 1:
            # Small log — annotate with format and fall through to normal stream
            for msg in reversed(messages):
                if msg["role"] == "user":
                    msg["content"] = (
                        f"[LOG FORMAT DETECTED: {log_format.replace('_', ' ').upper()}]\n\n"
                        f"{log_text}"
                    )
                    break
        else:
            # Large log — analyse each chunk then aggregate
            return StreamingResponse(
                _stream_chunked_log(base, req.model, system, log_format, chunks, req.conversation_id),
                media_type="text/event-stream",
                headers=_SSE_HEADERS,
            )

    # ── Code audit mode: detect language + OWASP ─────────
    elif req.mode == "codevuln":
        language = detect_language(req.message)
        for msg in reversed(messages):
            if msg["role"] == "user":
                msg["content"] = (
                    f"[DETECTED LANGUAGE: {language}]\n\n"
                    f"{OWASP_TOP10}\n\n"
                    f"--- CODE TO AUDIT ---\n"
                    f"{req.message}"
                )
                break

    # ── Default: stream directly ──────────────────────────
    return StreamingResponse(
        _stream_and_save(base, req.model, system, messages, req.conversation_id),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


# ── Streaming helpers ────────────────────────────────────

async def _stream_and_save(
    base: str,
    model: str,
    system: str,
    messages: list[dict],
    conversation_id: str,
):
    """Stream Ollama output to the client and persist the full reply."""
    full_reply = ""
    async for chunk in stream_ollama(base, model, system, messages):
        if chunk == "data: [DONE]\n\n":
            break
        full_reply += _token_from_sse(chunk)
        yield chunk

    if full_reply:
        save_message(conversation_id, "assistant", full_reply)
    yield "data: [DONE]\n\n"


async def _stream_chunked_log(
    base: str,
    model: str,
    system: str,
    log_format: str,
    chunks: list[str],
    conversation_id: str,
):
    """
    Analyse each log chunk independently, stream results, then stream a
    final aggregated summary across all chunks.
    """
    full_reply = ""
    chunk_analyses: list[str] = []
    fmt_label = log_format.replace("_", " ").upper()

    yield _sse(f"📋 Log format detected: **{log_format}** | Splitting into {len(chunks)} chunks for analysis...\n\n")

    for i, chunk in enumerate(chunks, 1):
        yield _sse(f"### Chunk {i}/{len(chunks)}\n")

        chunk_messages = [{
            "role": "user",
            "content": (
                f"[LOG FORMAT: {fmt_label}]\n"
                f"[CHUNK {i} of {len(chunks)}]\n\n"
                f"{chunk}"
            ),
        }]

        analysis = await call_ollama(base, model, system, chunk_messages)
        chunk_analyses.append(f"=== CHUNK {i} ANALYSIS ===\n{analysis}")

        for word in analysis.split(" "):
            token = word + " "
            full_reply += token
            yield _sse(token)

        yield _sse("\n\n")

    # Aggregate summary
    yield _sse("---\n## 🔍 AGGREGATE ANALYSIS ACROSS ALL CHUNKS\n\n")

    summary_messages = [{
        "role": "user",
        "content": (
            f"Below are individual analyses of {len(chunks)} chunks from a "
            f"{log_format} log file. Synthesize them into a comprehensive "
            "security report:\n\n" + "\n\n".join(chunk_analyses)
        ),
    }]

    summary = await call_ollama(base, model, SYSTEM_PROMPTS["log_summary"], summary_messages)
    for word in summary.split(" "):
        token = word + " "
        full_reply += token
        yield _sse(token)

    save_message(conversation_id, "assistant", full_reply.strip())
    yield "data: [DONE]\n\n"


# ── Tiny SSE utilities ───────────────────────────────────

def _sse(text: str) -> str:
    """Wrap plain text as an SSE data line."""
    return f"data: {json.dumps({'token': text})}\n\n"


def _token_from_sse(line: str) -> str:
    """Extract the token string from a raw SSE line produced by stream_ollama."""
    try:
        payload = line.removeprefix("data: ").strip()
        return json.loads(payload).get("token", "")
    except Exception:
        return ""