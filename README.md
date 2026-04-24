# ◈ ollama-ui

A local chat interface for Ollama with conversation history, file attachments, and security-focused modes.  
Built with Next.js + FastAPI + SQLite.

---

## Stack

- **Frontend**: Next.js (runs on `:5173`)
- **Backend**: FastAPI + SQLite (runs on `:8000`)
- **Inference**: Ollama (local or Colab GPU via ngrok)

---

## Requirements

- Python 3.10+
- Node.js 18+
- Ollama installed → https://ollama.com

---

## Quick Start (local)

### 1. Start Ollama with CORS enabled
```bash
OLLAMA_ORIGINS=* ollama serve
```

### 2. Pull a model
```bash
ollama pull llama3.2
# For image support:
ollama pull llava
```

### 3. Run the app
```bash
chmod +x start.sh
./start.sh
```

Open → **http://localhost:5173**

---

## Free GPU via Google Colab

If you don't have a GPU, run Ollama on Colab's free T4:

1. Open https://colab.research.google.com
2. Runtime → Change runtime type → **T4 GPU**
3. Run these cells:

```python
# Cell 1 — Install & start Ollama
!curl -fsSL https://ollama.com/install.sh | sh
import subprocess, time
subprocess.Popen(["ollama", "serve"])
time.sleep(3)
```

```python
# Cell 2 — Expose with ngrok
!pip install pyngrok -q
from pyngrok import ngrok
tunnel = ngrok.connect(11434)
print("Paste this into the endpoint box:", tunnel.public_url)
```

```python
# Cell 3 — Pull a model
!ollama pull llama3.2
# Good models to try: mistral, phi3, llava (multimodal), codellama
```

4. Paste the ngrok URL into the **ENDPOINT** box in the sidebar
5. Click **⟳** to load models

---

## Features

| Feature | Details |
|---|---|
| Conversation history | Saved to SQLite, resumable from sidebar |
| File attachments | Images (sent to model), PDFs (text extracted), text/code files |
| Model switcher | Lists all models pulled in Ollama |
| Mode: General | Standard assistant |
| Mode: CVE Explainer | Explains vulnerabilities, CVSS, mitigations |
| Mode: Log Analyzer | Flags suspicious activity with severity levels |
| Mode: Code Auditor | Reviews code for security vulnerabilities (OWASP/CWE) |
| Streaming | Tokens appear as they're generated |
| Markdown + syntax highlighting | Code blocks with copy button |

---

## Manual Setup (without start.sh)

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
│   ├── main.py          # FastAPI routes + streaming
│   ├── database.py      # SQLite operations
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.jsx            # Next.js root layout + fonts
│   │   ├── page.jsx              # Next.js entry page
│   │   └── globals.css           # Global style import
│   ├── src/
│   │   ├── App.jsx               # Main state + layout
│   │   └── components/
│   │       ├── Sidebar.jsx       # Convos, model, mode, endpoint
│   │       ├── ChatWindow.jsx    # Messages + markdown rendering
│   │       └── InputBar.jsx      # Textarea + file upload
│   ├── next.config.mjs
│   └── package.json
├── start.sh
└── README.md
```
