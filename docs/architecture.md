# Megan System Architecture

Megan is an extensible desktop AI intelligence system designed for Windows. It combines real-time screen copilot capabilities, smart workspace automation, and visual desktop memory with a high-throughput cloud LLM gateway and local OS automation.

---

## End-to-End System Topology

```
+-------------------------------------------------------------------------------+
|                           User Touchpoints                                    |
|   [ Multimodal Screen / Win32 ]  [ React 18 Web UI ]  [ Mic / Voice Input ]   |
+-------------------------------------------------------------------------------+
                                         │
                                         ▼
+-------------------------------------------------------------------------------+
|                         FastAPI Application Layer                             |
|   - Streaming Token WebSocket & Chat REST (/ws/chat, /api/chat/message)       |
|   - Multimodal Screen Copilot & Inspection (/api/copilot/inspect)             |
|   - Digital Memory & Visual Time Machine (/api/memory/*)                      |
|   - Automated Daily Standup Reports (/api/standup/*)                          |
|   - Safe File Organizer & Directory Watcher (/api/organizer/*)                |
|   - Workflow Macro Recorder & Runner (/api/macros/*)                          |
|   - User Authentication & Silo Isolation (/api/auth/*)                        |
|   - Whitelisted Desktop Automation (/api/automation/*)                        |
+-------------------------------------------------------------------------------+
                        │                               │
                        ▼                               ▼
+-----------------------------------+   +---------------------------------------+
|    Unified Cloud LLM Gateway      |   |        Local Desktop Engines          |
| - OpenAI-Compatible Gateway API   |   | - Win32 GDI Screen Capture (<15ms)    |
| - Fast Cloud Inference Engine     |   | - Tesseract OCR & Text Extraction     |
| - Vision Models (Nemotron/GPT-4o) |   | - Local ChromaDB Vector Store         |
| - Reasoning & Diff Extraction     |   | - PBKDF2 Local User Silos             |
+-----------------------------------+   | - Whitelisted Handlers & send2trash   |
                                        +---------------------------------------+
```

---

## Architectural Layers and Responsibilities

### 1. Unified Cloud LLM Gateway (`llm/`)
Megan utilizes a cloud LLM gateway architecture:
- `llm/gateway_client.py`: Interacts with OpenAI-compatible gateway endpoints (Kilo Code, OpenCode Zen, Nvidia NIM, Mistral, OpenAI). Supports streaming tokens, system instructions, and multimodal base64 image inspection.
- Reasoning Extraction: Strips or extracts model reasoning channels (`<think>`, `[REASONING]`) to present structured thoughts and final responses cleanly to the user.
- Zero Local Weight Footprint: Eliminates local GPU/VRAM bottlenecks, enabling instant startup and low-resource desktop operation.

### 2. Multimodal Screen Copilot (`copilot/`)
- Native Win32 screen capture via `ctypes` and GDI device contexts in less than 15 milliseconds.
- Automatic image downscaling and JPEG compression for rapid network transmission.
- Direct analysis of IDE code, terminal traces, and active GUI windows using vision models.

### 3. Digital Screen Memory and Visual Time Machine (`memory/`)
- Background screen capture with pixel-level diffing to avoid duplicate work.
- Process and title blacklisting to protect privacy (ignoring banking, password managers, and chat applications).
- Tesseract OCR text extraction and ChromaDB dense vector indexing for natural-language desktop recall.

### 4. Smart Workspace Suite
- **Daily Standup (`standup/`)**: Aggregates local Git commits, focus sessions, and screen memory topics into structured daily summaries.
- **File Organizer (`organizer/`)**: Two-tier file classifier (deterministic extension lookup + cloud LLM fallback) with SHA-256 duplicate suppression, background filesystem observer, and undoable audit logs.
- **Workflow Macros (`automation/macros/`)**: Macro recording engine capturing desktop actions and generating safe replayable automation workflows.
- **Safe Automation (`automation/`)**: Strict parameter-validated whitelist and confirmation gates with Recycle Bin protection (`send2trash`).

### 5. Local Authentication and Data Siloing (`auth/`)
- PBKDF2-HMAC-SHA256 password hashing with 100,000 salt rounds.
- Signed session tokens and per-user directory sandboxes under `data/users/<username>/`.

### 6. Modern Frontend (`frontend/`)
- Built with React 18, TypeScript, and Tailwind CSS.
- Features real-time Chat, Multimodal Screen Copilot, Visual Time Machine, Daily Standup, and Workflow Macros.
