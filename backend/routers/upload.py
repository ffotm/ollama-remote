import base64
import io

import pdfplumber
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()


@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or "file"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # ── PDF ──────────────────────────────────────────────
    if ext == "pdf":
        try:
            text = ""
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
            return {"filename": filename, "type": "text", "content": text.strip()}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parse error: {e}")

    # ── Image ────────────────────────────────────────────
    if file.content_type and file.content_type.startswith("image/"):
        b64 = base64.b64encode(content).decode()
        return {
            "filename": filename,
            "type": "image",
            "content": b64,
            "mimeType": file.content_type,
        }

    # ── Plain text / code / logs ─────────────────────────
    try:
        text = content.decode("utf-8", errors="replace")
        return {"filename": filename, "type": "text", "content": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read error: {e}")