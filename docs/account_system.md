# Local Account and User Isolation System

## Overview
Megan provides a local-first, privacy-preserving user authentication and data isolation system. All credentials, session tokens, and personal artifacts reside exclusively on the user's physical machine without any external telemetry or cloud identity providers.

---

## Architecture and Storage Layout

### 1. Database Schema (`data/users.db`)
User records are persisted in an embedded SQLite database (`users.db`) created under `DATA_DIR`:

```sql
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    display_name  TEXT    DEFAULT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login    TEXT    DEFAULT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1
);
```

### 2. Password Hashing
- **Algorithm**: PBKDF2-HMAC-SHA256
- **Salt**: 16 cryptographically secure random bytes (`os.urandom(16)`)
- **Iterations**: 100,000 rounds
- **Format**: `<salt_hex>$<hash_hex>`
- Constant-time verification using `hmac.compare_digest` to prevent timing attacks.

### 3. Session Tokens
- **Format**: Signed URL-safe Base64 tokens: `<payload_b64>.<sig_b64>`
- **Signing**: HMAC-SHA256 signed with a persistent 256-bit machine secret key (`data/auth_secret.key`).
- **Validity**: 7 days default lifetime (`exp`).
- **Stateless and Fast**: Validated in-memory with constant-time HMAC check without requiring external JWT dependencies.

---

## Per-User Directory Isolation

When a user is created, Megan automatically generates isolated workspaces under `data/users/<username>/`:

```
data/
└── users/
    ├── alice/
    │   ├── memory/         # Digital Memory: screenshots, OCR text, vector store
    │   ├── organizer/      # File Organizer: user-specific audit logs and rules
    │   ├── conversations/  # Chat history and multi-turn state
    │   └── settings/       # Per-user custom settings overrides
    └── bob/
        ├── memory/
        ├── organizer/
        ├── conversations/
        └── settings/
```

- **Path Sandboxing**: Path traversal attempts (e.g. `../../admin`) are rejected before disk evaluation.
- **Data Privacy**: Users cannot read, search, or index another user's screen memories or audit logs.

---

## CLI Usage

```bash
# Register a new local account
python main.py --register

# List registered local accounts
python main.py --list-users

# Display current active session and gateway status
python main.py --info
```

---

## REST API Endpoints (`/api/auth`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new username and password |
| `POST` | `/api/auth/login` | Authenticate and obtain a signed session token |
| `GET`  | `/api/auth/me` | Fetch active user profile from session token |
| `POST` | `/api/auth/logout` | Invalidate current session on the client |
| `GET`  | `/api/auth/users` | List registered accounts (usernames only) |
