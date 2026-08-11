---
sidebar_position: 10
---

# Audit Trail

The audit trail is an append-only record of platform activity, reviewable by administrators on the **Activity** page (requires the `audit:read` permission). It exists so you can answer *who did what, when* — for humans and AI agents alike.

## What is recorded

| Category | Source | Example entries |
|---|---|---|
| **Change** (`mutation`) | Every domain event — an entity was created, updated, or deleted (core and plugin entities) | "agent Pricing Bot created actor Bot Made Corp" |
| **MCP call** (`mcp_call`) | Every MCP `tools/call` invocation — read or write — with the tool name, its arguments, and the outcome (`ok` or an error code) | "agent Pricing Bot searched actors for 'Acme'" |
| **Auth** (`auth`) | Login success, login failure (attempted email only — never anything password-shaped), logout | "failed login for nobody@example.com" |

REST *reads* are not audited; MCP tool calls are always recorded — reads and writes alike — because agent activity would otherwise be invisible. MCP writes additionally produce the normal mutation entries.

## Who is recorded

Each entry carries an **actor kind**:

- **Human** — a session-authenticated [user](users.md).
- **Agent** — an agent-type user acting through its API key; the key's id and name are recorded too.
- **System** — no request context: seeders, CLI commands, migrations.

Actor details (email, name, key name) are **denormalized snapshots**: deleting a user later does not erase or anonymize its history. IP address and user agent are captured when available.

## What the trail does not guarantee

Capture is **post-commit, best-effort**: audit rows are written after the source transaction commits, outside it. A crashed audit insert loses that one entry (it is logged loudly) but never fails the underlying operation. Entries are immutable through the API — there are no update or delete endpoints — but database-level immutability (REVOKE, triggers) is the operator's responsibility.

## Retention

Nothing is deleted automatically. To prune old entries:

```bash
# Dry run — prints what would be deleted
pnpm audit:prune -- --before 2026-01-01

# Actually delete
pnpm audit:prune -- --before 2026-01-01 --execute
```

Dates less than 30 days in the past additionally require `--force`.
