import httpx
import json
import uuid
import os
import pdfplumber
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from database import init_db, save_message, get_conversations, get_messages, create_conversation, delete_conversation, rename_conversation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
OLLAMA_BASE_URL = "https://delaware-script-metro-dragon.trycloudflare.com"

OLLAMA_BASE = OLLAMA_BASE_URL
CF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

init_db()

# ── MODELS ──────────────────────────────────────────────
@app.get("/api/models")
async def get_models():
    async with httpx.AsyncClient(timeout=10, headers=CF_HEADERS) as client:
        try:
            res = await client.get(f"{OLLAMA_BASE}/api/tags")
            return res.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Ollama unreachable: {e}")
# ── CONVERSATIONS ────────────────────────────────────────
@app.get("/api/conversations")
def list_conversations():
    return get_conversations()

@app.post("/api/conversations")
def new_conversation(body: dict):
    title = body.get("title", "New Chat")
    cid = create_conversation(title)
    return {"id": cid, "title": title}

@app.delete("/api/conversations/{cid}")
def remove_conversation(cid: str):
    delete_conversation(cid)
    return {"ok": True}

@app.patch("/api/conversations/{cid}")
def update_conversation_title(cid: str, body: dict):
    rename_conversation(cid, body.get("title", "Chat"))
    return {"ok": True}

@app.get("/api/conversations/{cid}/messages")
def list_messages(cid: str):
    return get_messages(cid)

# ── FILE UPLOAD ──────────────────────────────────────────
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or "file"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        try:
            text = ""
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
            return {"filename": filename, "type": "text", "content": text.strip()}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parse error: {e}")

    if file.content_type and file.content_type.startswith("image/"):
        import base64
        b64 = base64.b64encode(content).decode()
        return {"filename": filename, "type": "image", "content": b64, "mimeType": file.content_type}

    # plain text files
    try:
        text = content.decode("utf-8", errors="replace")
        return {"filename": filename, "type": "text", "content": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {e}")


@app.get("/api/test")
async def test_connection():
    async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "curl/7.68.0"}) as client:
        try:
            res = await client.get(f"{OLLAMA_BASE}/api/tags")
            return {"status": "ok", "code": res.status_code, "body": res.text[:200]}
        except Exception as e:
            return {"status": "error", "detail": str(e)}

# ── CHAT STREAM ──────────────────────────────────────────
class ChatRequest(BaseModel):  

    conversation_id: str
    model: str
    message: str
    images: Optional[list[str]] = None
    mode: Optional[str] = "general"  # general | cve | log | codevuln
    ollama_base: Optional[str] = None

SYSTEM_PROMPTS = {
    "general": "You are a helpful assistant.",
    "cve": (
        "You are a cybersecurity expert specializing in vulnerability analysis. "
        "When given a CVE ID or vulnerability description, provide: "
        "1) A clear plain-English explanation of what the vulnerability is, "
        "2) Affected systems/versions, "
        "3) CVSS score and severity if known, "
        "4) Attack vector and how it can be exploited, "
        "5) Concrete mitigation steps and patches. "
        "Be precise and practical."
    ),
    "log": (
        "You are a security analyst. The user will provide log file contents. "
        "Analyze them and identify: suspicious activity, anomalies, failed auth attempts, "
        "port scans, unusual IPs, malware indicators, or privilege escalation attempts. "
        "Format your response with a summary first, then a detailed breakdown by finding. "
        "Flag severity as CRITICAL / HIGH / MEDIUM / LOW for each finding."
    ),
    "codevuln": (
        "You are a secure code review expert. Analyze the provided code for security vulnerabilities. "
        "For each issue found, state: vulnerability type (e.g. SQLi, XSS, buffer overflow, hardcoded creds), "
        "the exact line or code snippet, severity (CRITICAL/HIGH/MEDIUM/LOW), "
        "why it's dangerous, and a fixed version of the code. "
        "Use OWASP and CWE references where relevant."
    ),
}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    base = req.ollama_base or OLLAMA_BASE

    # Save user message
    save_message(req.conversation_id, "user", req.message)

    # Auto-title conversation after first message
    words = req.message.split()[:6]
    auto_title = " ".join(words) + ("…" if len(req.message.split()) > 6 else "")
    rename_conversation(req.conversation_id, auto_title)

    # Build history for context
    history = get_messages(req.conversation_id)
    messages = []

    system = SYSTEM_PROMPTS.get(req.mode, SYSTEM_PROMPTS["general"])

    for m in history:
        role = m["role"]
        content = m["content"]
        messages.append({"role": role, "content": content})

    # Attach images to last user message if present
    if req.images and messages:
        for msg in reversed(messages):
            if msg["role"] == "user":
                msg["images"] = req.images
                break

    async def stream():
        full_reply = ""
        try:
            async with httpx.AsyncClient(timeout=120, headers=CF_HEADERS) as client:
                async with client.stream("POST", f"{base}/api/chat", json={
                    "model": req.model,
                    "stream": True,
                    "system": system,
                    "messages": messages,
                }) as res:
                    async for line in res.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            full_reply += token
                            yield f"data: {json.dumps({'token': token})}\n\n"
                            if data.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if full_reply:
                save_message(req.conversation_id, "assistant", full_reply)
            yield "data: [DONE]\n\n"
    return StreamingResponse(
    stream(), 
    media_type="text/event-stream",
    headers={
        "X-Accel-Buffering": "no",  # Disables buffering in Nginx/Proxies
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
)