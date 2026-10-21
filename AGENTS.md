# AGENTS.md

Megan is a Windows-first desktop AI assistant: FastAPI backend, React/Vite frontend, local SQLite auth, Win32 screen capture, and a cloud OpenAI-compatible LLM gateway. The repo still contains legacy local-model/activation-steering code and stale docs. Prefer code over README/docs.

## Commands

```powershell
# Backend (run from repo root; port 8000 is assumed by the frontend)
pip install -r requirements.txt
pip install -r requirements-dev.txt  # needed for tests/lint
python -m uvicorn api.server:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev    # http://localhost:5173
npm run lint
npm run build  # tsc && vite build -> ../api/static (tracked in git, served at /dashboard)
```

CLI entrypoint: `python main.py --info`, `--register`, `--organize --dry-run`, `--memory-search "..."`, `--standup`, `--macro-list`, `--focus "Coding"`. The bare interactive REPL still assumes local model/steering and is not the gateway path.

## Tests

- `tests/` contains only empty placeholder files; `pytest tests/` collects **zero** tests. Do not rely on it.
- Real tests are the root standalone `unittest` scripts: `python test_auth.py`, `test_memory.py`, `test_focus.py`, `test_standup.py`, `test_macro.py`. There is no aggregate runner.
- Bare `pytest` fails unless `requirements-dev.txt` is installed because `pyproject.toml` hardcodes coverage flags (`--cov=. --cov-report=term-missing`). Override with `-o addopts=""` if needed.
- `test_standup.py` (and other memory-related tests) may download the `all-MiniLM-L6-v2` embedding model from Hugging Face; expect ~90s and network access. `test_auth.py` writes/removes accounts in `data/users.db`.

## Architecture facts

- Backend entrypoint is `api/server.py:create_app()`. Routers are registered explicitly there; services are injected at startup through each route module's `init(...)` (chat, memory, automation, organizer, steering, voice, focus). Add new services/routes in both places.
- LLM is cloud-only: `llm/gateway_client.py` reads `GATEWAY_BASE_URL`, `KILO_API_KEY` or `GATEWAY_API_KEY`, `DEFAULT_MODEL`, `VISION_MODEL`. `llm.loader` / `llm.engine` are mock/gateway shims; no local weights are loaded despite `requirements.txt`, `configs/model_config.yaml`, README, and ROADMAP.
- Screen Copilot (`core/copilot_service.py`) captures the monitor with Win32 GDI via `ctypes`, compresses to JPEG, and sends it to the vision model. This is Windows-only.
- Auth is local PBKDF2 + SQLite (`data/users.db`), with per-user silos at `data/users/<username>/{memory,organizer,conversations,settings}`. Most routes are unauthenticated; only `/api/auth/*` and memory use `get_current_user`.
- Config comes from `configs/*.yaml` via `core.config`, plus `.env`; `core.constants` auto-creates `data/` subdirectories on import. `INES_DEVICE` is a legacy env override.
- Frontend calls `http://localhost:8000` directly in places (e.g. `frontend/src/App.tsx`) even though Vite proxies `/api` and `/ws`; keep the backend on port 8000.
- External requirement: Tesseract OCR is not pip-installable. Without it, Digital Memory degrades to metadata-only capture.

## Repo gotchas

- README's repository tree is partly stale: it lists `reports/` (actual: `standup/`) and old organizer filenames (actual: `organizer/classifier.py`, `rules.py`, `watcher.py`). `docs/architecture.md` and `ROADMAP.md` describe the removed local steering design.
- `api/static/` is committed build output; rebuilding the frontend overwrites tracked files.
- Never commit `.env`, `data/`, model weights, or generated screenshots/reports (gitignored).
- Style: Black/Ruff line length 100; Ruff rules `E,F,W,I`; mypy ignores missing imports. Frontend is TypeScript + Tailwind + Zustand.
- Workflow per `CONTRIBUTING.md`: `feature/*` branches, Conventional Commits, PRs to `main`.
- Target Python is 3.10/3.11. The machine's current interpreter is 3.14, which may lack wheels for pinned ML dependencies.
