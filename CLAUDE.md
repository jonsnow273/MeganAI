# CLAUDE.md - Megan AI Desktop Assistant

## Project Overview
**Megan** is a privacy-first AI desktop assistant with Multimodal Screen Copilot capabilities. It combines:
- **FastAPI backend** with WebSocket streaming
- **React 18 + Vite + Tailwind CSS** frontend dashboard
- **Win32 GDI screen capture** for live desktop analysis
- **Cloud LLM Gateway** (OpenAI-compatible: Kilo Code, OpenCode, Nvidia NIM, Mistral)
- **Local SQLite auth** with per-user workspace silos
- **Digital Memory** (ChromaDB + OCR + pixel-diff capture)

## Key Architecture Facts
- **Backend entrypoint**: `api/server.py:create_app()` — registers all routers & wires services at startup
- **LLM is cloud-only**: `llm/gateway_client.py` reads `GATEWAY_BASE_URL`, `KILO_API_KEY`, `DEFAULT_MODEL`, `VISION_MODEL`
- **Screen Copilot** (`core/copilot_service.py`) captures monitor via Win32 GDI (<15ms), compresses to JPEG, sends to vision model
- **Auth**: PBKDF2 + SQLite (`data/users.db`), per-user silos at `data/users/<username>/{memory,organizer,conversations,settings}`
- **Config**: `configs/*.yaml` via `core.config`, plus `.env`; `core.constants` auto-creates `data/` subdirs on import
- **Frontend** calls `http://localhost:8000` directly in places (keep backend on port 8000)
- **External**: Tesseract OCR required for full Digital Memory (pip-installable wrapper only)

## Repo Gotchas
- README's repo tree is stale: lists `reports/` (actual: `standup/`), old organizer filenames
- `api/static/` is committed build output; rebuilding frontend overwrites tracked files
- `tests/` contains only empty placeholders; real tests are root `test_*.py` scripts
- Python 3.14 on this machine may lack wheels for pinned ML deps (torch, bitsandbytes, etc.)

## Commands
```powershell
# Backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
python -m uvicorn api.server:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run build      # tsc && vite build -> ../api/static

# CLI
python main.py --info
python main.py --register
python main.py --organize --dry-run
python main.py --memory-search "..."
python main.py --standup
python main.py --macro-list

# Tests (standalone unittest scripts)
python test_auth.py
python test_memory.py
python test_focus.py
python test_standup.py
python test_macro.py
```

## Current Phase (from ROADMAP)
**Phase 3: Multimodal Vision and Screen Copilot (In Progress)**
- [x] Win32 screen capture, [x] compression, [x] diagnosis endpoint, [x] Digital Memory, [x] Visual Time Machine
- [ ] Multi-monitor display selection, [ ] Active window region bounding box selector

**Phase 4: Voice Pipeline & System Tray** — mostly pending

## Development Preferences
- Style: Black/Ruff line length 100; Ruff rules `E,F,W,I`; mypy ignores missing imports
- Frontend: TypeScript + Tailwind + Zustand
- Workflow: `feature/*` branches, Conventional Commits, PRs to `main`
- Never commit `.env`, `data/`, model weights, or generated screenshots/reports (gitignored)

## Key Files to Know
| Area | File |
|------|------|
| App entry | `main.py` |
| FastAPI app | `api/server.py` |
| Config | `core/config.py`, `configs/*.yaml` |
| LLM Gateway | `llm/gateway_client.py` |
| Screen Copilot | `core/copilot_service.py`, `api/routes/copilot.py` |
| Auth | `auth/` package |
| Memory | `memory/` package |
| Organizer | `organizer/` package |
| Frontend root | `frontend/src/App.tsx` |
| Screen Copilot UI | `frontend/src/components/Features/ScreenCopilotView.tsx` |