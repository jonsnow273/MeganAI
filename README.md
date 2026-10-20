# Megan: Privacy-First AI Desktop Assistant with Multimodal Screen Copilot

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React + Tailwind](https://img.shields.io/badge/Frontend-React%20%7C%20Tailwind-61DAFB.svg)](https://react.dev/)

> **"A privacy-first intelligent desktop companion that sees your screen, troubleshoots errors in real-time, automates repetitive routines, and synthesizes your daily work."**

**Megan** is an extensible desktop AI intelligence system. Powered by a high-throughput cloud gateway engine and on-device Win32 screen capture, Megan combines real-time **Multimodal Screen Copilot** capabilities with a complete **Smart Workspace Suite** designed for developers and knowledge workers.

---

## Core Capabilities Overview

- **Live Multimodal Screen Copilot ("See & Act")**: Instant one-click capture of your primary monitor. Transmits screenshots to a vision model to diagnose terminal stack traces, review IDE code, explain active interfaces, and prescribe actionable fixes with zero manual copy-pasting.
- **Unified Cloud LLM Gateway**: Connects to OpenAI-compatible API gateways (Kilo Code, OpenCode Zen, Nvidia NIM, Mistral) with automatic reasoning extraction, zero CPU inference lag, and instant startup without local model downloads.
- **Safe Desktop Automation**: Sandboxed execution boundary with strict whitelist governance, explicit confirmation modals for destructive operations, and system Recycle Bin protection.
- **AI-Powered File Organizer**: Two-tier taxonomy classifier (instant extension matching + LLM fallback for ambiguous invoices, notes, and code) with SHA-256 duplicate suppression, background directory watching, and full undo audit logs.
- **Digital Screen Memory**: Background screen capture with pixel-difference change detection, RAM-level privacy blacklist filters, OCR text extraction, and persistent ChromaDB vector storage for natural-language desktop recall.
- **Visual Time Machine**: Interactive timeline scrubber enabling users to review historical desktop activity minute by minute with one-click OCR clipboard extraction.
- **Automated Daily Standup Reports**: Multi-source aggregator synthesizing local Git commits, active focus hours, and screen memory topics into structured daily reports (Done, Doing, Blockers).
- **Autonomous Workflow Macro Recorder**: Natural-language and input-driven routine recorder that generates safe, replayable desktop automation scripts.
- **Focus & Anti-Distraction Coach**: Active window tracker that detects context drift, issues gentle nudges, and provides one-click workspace restoration.
- **Multi-User Cryptographic Isolation**: PBKDF2-HMAC-SHA256 local authentication with per-user data directory sandboxing.

---

## Live Multimodal Screen Copilot

The core interactive feature of Megan is the **Live Screen Copilot**. When troubleshooting code, terminal errors, or application settings, users no longer need to copy stack traces, describe UI states, or manually crop screenshots.

```
Desktop State (IDE / Terminal / Browser)
                    │
                    ▼
   [ Win32 GDI Screen Capture Engine ]  (Direct frame grab via ctypes, <15ms)
                    │
                    ▼
        [ Frame Optimization ]          (Aspect ratio preserve, JPEG compression)
                    │
                    ▼
     [ Multimodal Vision LLM ]         (e.g., Nvidia Nemotron VL / Qwen-VL / GPT-4o)
                    │
                    ▼
       [ Structured Diagnosis ]         (Root cause, code diff, shell fix command)
```

### Supported Inspection Workflows

| Mode | Trigger | Output Provided |
|---|---|---|
| **Diagnose Terminal Error** | Quick Action Chip / Prompt | Root cause breakdown of the active stack trace and the exact shell command to resolve it. |
| **Review Code on Screen** | Quick Action Chip / Prompt | Line-by-line inspection of visible editor buffers, flagging syntax bugs, type mismatches, and edge cases. |
| **Explain What I am Looking At** | Quick Action Chip / Prompt | Contextual summary of the foreground window, documentation, or dashboard. |
| **Custom Visual Query** | Textarea Input | Answers specific questions about visual elements (e.g. *"What CSS rule is breaking this alignment?"*). |

---

## System Architecture

```
                                      [ User Touchpoints ]
                     Voice ("Hey Megan")  │  Web Dashboard (React)  │  Terminal CLI
                                                ▼
                                      ┌─── [ Auth Gate ] ───┐
                                      │  (Login / Session)   │
                                      └─────────┬───────────┘
                                                ▼
                                      [ FastAPI Gateway ]
                                                │
       ┌──────────────┬────────────────────┬────┴───────────────┬────────────────────┬──────────────────┐
       ▼              ▼                    ▼                    ▼                    ▼                  ▼
[ Intent          [ Screen Copilot ]   [ File Organizer ]  [ Digital Memory ]   [ Focus & Macro   [ User Account
  Classifier ]         │                   │                    │               Engine ]          System ]
       │          ┌────┴─────┐       ┌─────┴─────┐        ┌────┴─────┐          │                  │
       ├─► Chat   ▼          ▼       ▼           ▼        ▼          ▼     [ Focus Tracker ]    users.db
       │       [ Win32    [ Vision [ Rules +   [ Folder   [ Screen   [ Vector     │               (SQLite)
       │         GDI ]      LLM ]  LLM Class]  Watcher]  Capture ]  Store ]   [ Macro Replay ]     │
       │                                   │       │        │          │          │           data/users/
       └─► Automation                      ▼       │     [ OCR ]    [ ChromaDB ]  │           <username>/
              │                       [ Audit + ◄──┘   (Tesseract)     ▲          ▼               │
     [ Whitelist ]                     Undo ]                   │      │    [ OS Handlers ]  {memory, reports,
              │                                            [ Embeddings ]       ▲           settings}
     [ Confirm ]                                      (Sentence-Transformers)   │
              │                                                                 │
     [ OS Handlers ] ───────────────────────────────────────────────────────────┘
              │
              ▼
    [ Cloud LLM Gateway Client ]
 (Kilo Code / OpenCode / Nvidia NIM / Mistral)
```

---

## Technology Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend Framework** | **React 18 + Vite + Tailwind CSS** | Real-time dark-themed desktop interface with Lucide icons |
| **Backend Framework** | **FastAPI + Uvicorn + WebSockets** | Asynchronous REST endpoints and bidirectional streaming channels |
| **LLM Gateway** | **GatewayClient (`llm/gateway_client.py`)** | OpenAI-compatible HTTP client supporting streaming and reasoning fallback |
| **Vision Model** | **Multimodal Vision LLM** | Screen inspection model (`nvidia/nemotron-3.5-super-vl` or gateway default) |
| **Chat & Reasoning** | **Gateway Default Model** | Fast instruction model (`kilo-auto/free` auto-routed tier) |
| **Screen Capture** | **Win32 GDI via `ctypes`** | High-performance Windows desktop frame acquisition |
| **Semantic Embeddings** | **Sentence-Transformers (`all-MiniLM-L6-v2`)** | 384-dimensional dense vectors for semantic memory queries |
| **Vector Database** | **ChromaDB** | Persistent vector index for desktop OCR memory recall |
| **Filesystem Monitor** | **watchdog** | Kernel-level file creation and modification observer |
| **Local Authentication** | **SQLite + PBKDF2-HMAC-SHA256** | 100,000 salt rounds and signed session tokens with workspace silos |

---

## Repository Structure

```
MeganAI/
├── api/                     # FastAPI backend application
│   ├── middleware/          # CORS origin handling and exception handlers
│   ├── routes/              # REST routes (auth, chat, copilot, organizer, memory, macro, standup)
│   ├── schemas/             # Pydantic request and response schemas
│   ├── websocket/           # WebSocket streaming endpoints
│   └── server.py            # FastAPI entry point and startup orchestration
├── auth/                    # Cryptographic authentication and user workspace silos
│   ├── database.py          # SQLite database connection and schema setup
│   ├── middleware.py        # Token verification and authorization dependencies
│   ├── models.py            # User credentials models
│   └── service.py           # PBKDF2 hashing, signed session tokens, user accounts
├── automation/              # Desktop automation and macro recorder
│   ├── action_handler.py    # Whitelisted OS execution engine
│   ├── confirmation.py      # Interactive user confirmation gates
│   ├── whitelist.py         # Whitelist schemas and action validators
│   └── macro/               # Autonomous macro recorder and player (Win32 input simulation)
├── chatbot/                 # Multi-turn conversation and session tracking
│   ├── context_manager.py   # Token trimming and message sliding window
│   ├── history.py           # JSON session conversation storage
│   └── language_manager.py  # System prompt management
├── configs/                 # Declarative YAML configurations
│   ├── automation_whitelist.yaml # Allowed executable operations
│   ├── languages.yaml       # Multilingual definitions
│   ├── megan_settings.yaml  # Global system settings
│   ├── memory_privacy.yaml  # Blacklisted processes and window keywords
│   └── model_config.yaml    # Model IDs and parameter overrides
├── core/                    # Core foundation and shared services
│   ├── config.py            # Central settings manager
│   ├── constants.py         # Application paths and directory layout
│   ├── copilot_service.py   # Win32 screen capture and Multimodal Vision Copilot service
│   └── logger.py            # Structured application logging
├── data/                    # Local storage (git-ignored)
│   ├── users/               # Per-user isolated directories (<username>/)
│   ├── users.db             # User accounts SQLite database
│   └── memory/              # Screen memory snapshots and vector indices
├── frontend/                # React 18 + Vite + Tailwind CSS interface
│   ├── src/components/      # UI components (Copilot, Chat, Layout, Modals)
│   │   ├── Copilot/         # ScreenCopilotPanel (Live capture and visual diagnosis)
│   │   ├── Chat/            # ChatWindow, InputBar, MessageBubble
│   │   ├── Memory/          # VisualTimeMachine scrubber
│   │   ├── Standup/         # StandupModal report generator
│   │   └── Automation/      # MacroRecorderModal and CommandLog
│   └── package.json         # Frontend dependencies and build scripts
├── llm/                     # LLM gateway inference integration
│   ├── gateway_client.py    # OpenAI-compatible gateway client with vision support
│   └── inference.py         # GatewayInferenceEngine drop-in interface
├── memory/                  # Digital Screen Memory subsystem
│   ├── capture.py           # Change-detected screen capture
│   ├── privacy.py           # Foreground window blacklist inspector
│   ├── ocr.py               # Optical character recognition wrapper
│   ├── store.py             # ChromaDB vector store
│   └── service.py           # Memory background coordinator
├── organizer/               # AI-powered file organizer subsystem
│   ├── audit.py             # JSON move audit log with one-click undo
│   ├── file_classifier.py   # Two-tier classifier (extensions + LLM fallback)
│   ├── mover.py             # Duplicate suppression with SHA-256
│   └── service.py           # Watchdog directory observer service
├── reports/                 # Work synthesis and reporting
│   └── standup_generator.py # Git commit, focus hour, and memory aggregator
├── voice/                   # Speech recognition pipeline
│   ├── pipeline.py          # Microphone audio processor
│   └── transcriber.py       # Whisper speech-to-text wrapper
├── main.py                  # Terminal CLI entry point
├── test_auth.py             # Authentication unit tests
├── test_memory.py           # Digital Memory unit tests
├── test_standup.py          # Daily Standup generator unit tests
├── test_macro.py            # Macro recorder unit tests
└── requirements.txt         # Production dependencies
```

---

## Quick Start Guide

### Prerequisites
- **Python**: 3.10 or 3.11
- **Node.js**: 18+ and `npm`
- **Operating System**: Windows 10/11 (for Win32 GDI screen capture and desktop automation)
- **API Key**: Kilo Code Gateway API key (or any OpenAI-compatible gateway key)

### 1. Backend Setup

```bash
git clone https://github.com/jonsnow273/MeganAI.git
cd MeganAI

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env configuration file
```

In `.env`, configure your gateway credentials:

```env
KILO_API_KEY=your_gateway_key_here
GATEWAY_BASE_URL=https://ai-gateway.kilo.ai/api/v1
DEFAULT_MODEL=kilo-auto/free
VISION_MODEL=nvidia/nemotron-3.5-super-vl:free
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 3. Launching Megan

In separate terminal windows:

```bash
# Terminal 1: Launch FastAPI Backend Server
python -m uvicorn api.server:app --reload --port 8000

# Terminal 2: Launch React Frontend Dashboard
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## CLI Commands Quick Reference

```bash
# Display system info and gateway configuration
python main.py --info

# Register a local user account
python main.py --register

# List registered user accounts
python main.py --list-users

# File Organizer: dry-run preview without moving files
python main.py --organize --dry-run

# File Organizer: execute file organization immediately
python main.py --organize

# File Organizer: start background folder observer daemon
python main.py --watch

# Digital Memory: capture active screen immediately
python main.py --memory-capture

# Digital Memory: search indexed screen history via query
python main.py --memory-search "FastAPI configuration"

# Digital Memory: start background capture worker
python main.py --memory-start
```

---

## Testing & Verification

Comprehensive automated test suites cover authentication, memory, standup synthesis, and macro recording:

```bash
# Run Authentication & Silo Isolation Tests
python test_auth.py

# Run Digital Memory & Privacy Guard Tests
python test_memory.py

# Run Daily Standup Synthesis Tests
python test_standup.py

# Run Macro Recorder & Player Tests
python test_macro.py
```

---

## License

This project is licensed under the [MIT License](LICENSE).
