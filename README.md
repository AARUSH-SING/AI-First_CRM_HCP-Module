# AI-First CRM (HCP Module) – Log Interaction Screen

This repo contains a minimal **AI-first HCP CRM** prototype focused on the **Log Interaction** workflow:

- `frontend/`: React + Redux UI (Google **Inter** font) with a **structured form** (left) and **AI chat logger** (right)
- `backend/`: FastAPI + **LangGraph** agent using **Groq** (default **`llama-3.3-70b-versatile`**) for extraction + summarization. Groq decommissioned **`gemma2-9b-it`**; their listed replacement is **`llama-3.1-8b-instant`** ([deprecations](https://console.groq.com/docs/deprecations)). Set optional env **`GROQ_MODEL`** to switch models.

## Run (local)

### Backend

```powershell
cd "backend"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Set your Groq token (or put GROQ_API_KEY / GROQ_MODEL in repo-root `.env`)
$env:GROQ_API_KEY="YOUR_GROQ_API_KEY"
# Optional: $env:GROQ_MODEL="llama-3.1-8b-instant"

python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd "frontend"
npm install
npm run dev
```

Open the UI at `http://localhost:5173`.

## What the AI does (high level)

The AI assistant supports **two entry modes**:

1. **Structured entry**: reps fill the form directly (best for compliance + reporting).
2. **Conversational entry**: reps paste/describe what happened; the AI extracts a *patch* to populate the same structured fields.

The backend uses **LangGraph** (tool-calling agent) to reliably:

- extract entities (HCP, attendees, materials, samples)
- infer sentiment when explicitly stated
- summarize scientific exchange + outcomes
- draft compliant follow-ups (suggestions only)

