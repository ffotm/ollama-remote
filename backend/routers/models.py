from fastapi import APIRouter, HTTPException
import httpx

from config import OLLAMA_BASE_URL, CF_HEADERS

router = APIRouter()


@router.get("/api/models")
async def get_models():
    async with httpx.AsyncClient(timeout=10, headers=CF_HEADERS) as client:
        try:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return res.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Ollama unreachable: {e}")


@router.get("/api/test")
async def test_connection():
    async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "curl/7.68.0"}) as client:
        try:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return {"status": "ok", "code": res.status_code, "body": res.text[:200]}
        except Exception as e:
            return {"status": "error", "detail": str(e)}