# Security Policy

## Security Philosophy
Because Megan combines Large Language Models with desktop automation and command execution, safety and security are fundamental design requirements.

### Key Safeguards
1. **Strict Whitelist Architecture**: Megan does not execute arbitrary shell commands. It maps intents exclusively to pre-defined Python handlers in `automation/handlers/`.
2. **Mandatory Confirmation Gate**: Any destructive action (file/directory deletion, file overwrites) requires explicit user confirmation before execution.
3. **Safe Deletion**: Deletions use system recycle bin utilities (`send2trash`), avoiding permanent `os.remove` data loss.
4. **Sandboxed Directory Scopes**: Operations are constrained to user-permitted paths to prevent modifications to system directories (`C:\Windows`, `System32`, root system drives).
5. **Secure Gateway Communication**: Sensitive credentials and authentication tokens reside on the local device (`data/users.db`). LLM inference requests are transmitted over encrypted TLS connections to the user-configured OpenAI-compatible gateway.

## Reporting a Vulnerability
If you discover a security vulnerability or sandbox bypass:
1. Do not create a public GitHub issue.
2. Email the maintainers directly or open a private security advisory on GitHub.
3. Please include reproduction steps, environment details, and sample commands.
4. The team will acknowledge receipt within 48 hours and provide an estimated fix timeline.
