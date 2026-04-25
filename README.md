# ◈ ollama-ui

A self-hosted AI security workbench for the homelab. Runs entirely local — no cloud, no API keys, no data leaving your machine.  
Built to assist with day-to-day security research: explaining CVEs with live NVD data, analyzing logs, and auditing code — all through a local LLM.

> **Homelab context:** Designed to run on a local machine or home server alongside tools like Wazuh, Suricata, or OpenVAS. Feed it your actual lab logs, paste CVEs you're researching, or throw code at it for a second opinion.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (`:5173`) |
| Backend | FastAPI + SQLite (`:8000`) |
| Inference | Ollama — local GPU or Colab T4 via ngrok |
| Threat Intel | NVD API (live CVE data, no key required) |

---

## Security Modes

| Mode | What it actually does |
|---|---|
| **CVE Explainer** | Fetches live data from NVD API for the CVE you mention — CVSS breakdown, affected versions, references. Model explains real data, not training memory. |
| **Log Analyzer** | Auto-detects log format (nginx, auth.log, syslog, Windows Event, CEF, CloudTrail, iptables, and more). Chunks large files so nothing overflows context. Produces per-chunk findings + aggregated summary with severity levels. |
| **Code Auditor** | Detects language automatically. Walks through OWASP Top 10 systematically. Tags findings with CWE IDs and severity. Ends with a /10 security score. |
| **General** | Standard assistant for everything else. |

---

## Requirements

- Python 3.10+
- Node.js 18+
- Ollama → https://ollama.com

---

## Quick Start

### 1. Start Ollama
```bash
OLLAMA_ORIGINS=* ollama serve
```

### 2. Pull a model
```bash
ollama pull llama3.2

# For image support (analyzing screenshots, diagrams):
ollama pull llava

# Better for code auditing if your machine can handle it:
ollama pull codellama
```

### 3. Run
```bash
chmod +x start.sh
./start.sh
```

Open → **http://localhost:5173**

---

## No GPU? Use Google Colab (free T4)

Useful if you're running this on a low-spec home server or a laptop.

1. Open https://colab.research.google.com
2. Runtime → Change runtime type → **T4 GPU**

```python
# Cell 1 — Install and start Ollama
!curl -fsSL https://ollama.com/install.sh | sh
import subprocess, time
subprocess.Popen(["ollama", "serve"])
time.sleep(3)
```

```python
# Cell 2 — Expose via ngrok
!pip install pyngrok -q
from pyngrok import ngrok
tunnel = ngrok.connect(11434)
print("Paste this URL into the ENDPOINT box:", tunnel.public_url)
```

```python
# Cell 3 — Pull a model
!ollama pull llama3.2
```

Paste the ngrok URL into the **ENDPOINT** field in the sidebar → click **⟳**.

---

## Homelab Integration Ideas

This tool is most useful when it has real data to work with:

- **Wazuh** — pipe alert logs into the Log Analyzer for AI-assisted triage
- **Suricata** — feed IDS alerts for pattern explanation and severity context
- **OpenVAS/Greenbone** — paste CVEs from scan reports into CVE Explainer for deeper breakdowns
- **Your own CTF/lab VMs** — run Code Auditor against intentionally vulnerable apps (DVWA, VulnHub) to see what it catches

---

## Manual Setup

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
ollama-ui/
├── backend/
│   ├── main.py                  # App entry, /api/chat route + mode routing
│   ├── config.py                # Env vars and constants
│   ├── prompts.py               # All LLM system prompts
│   ├── ollama.py                # Streaming + blocking Ollama HTTP wrappers
│   ├── database.py              # SQLite conversation persistence
│   ├── routers/
│   │   ├── models.py            # GET /api/models, /api/test
│   │   ├── conversations.py     # Conversation CRUD
│   │   └── upload.py            # File upload + PDF extraction
│   ├── analyzers/
│   │   ├── cve.py               # NVD API fetch, CVSS parsing, context builder
│   │   ├── log.py               # Format detection (12 formats), chunking
│   │   └── code.py              # Language detection (15 langs), OWASP checklist
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   └── globals.css
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── Sidebar.jsx      # Conversations, model, mode, endpoint
│   │       ├── ChatWindow.jsx   # Messages + markdown rendering
│   │       └── InputBar.jsx     # Textarea + file upload
│   ├── next.config.mjs
│   └── package.json
├── start.sh
└── README.md
```

---

## Environment Variables

```bash
# Optional — unauthenticated NVD access works but is rate-limited (8 req/30s)
# Register free at https://nvd.nist.gov/developers/request-an-api-key for 50 req/30s
NVD_API_KEY=your_key_here

# Override default Ollama endpoint (useful for remote/Colab setups)
OLLAMA_BASE_URL=https://your-ngrok-url.trycloudflare.com
```