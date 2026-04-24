import os

# ── Ollama ───────────────────────────────────────────────
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "https://struck-wellington-side-salt.trycloudflare.com",
)

CF_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# ── NVD ──────────────────────────────────────────────────
NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"
# Optional — unauthenticated works but is rate-limited to 8 req/30s.
# Set this env var for 50 req/30s authenticated access.
NVD_API_KEY = os.getenv("NVD_API_KEY", "")

# ── Log chunking ─────────────────────────────────────────
# ~4 chars/token; keep chunks under 6k tokens to leave headroom for the prompt
LOG_CHUNK_SIZE = 24_000  # characters

# ── CORS ─────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]