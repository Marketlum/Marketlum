---
sidebar_position: 8
---

# Users

Users are the authentication identities that operate a Marketlum market — through the web admin, the REST API, or MCP. They are distinct from [Actors](actors.md): an actor is a *market participant* (who trades), a user is *who is operating the software*.

## User types

| Type | Logs into the admin | Authenticates with | Created by |
|---|---|---|---|
| **Human** | Yes (email + password) | Password session (JWT cookie) or self-service API keys | Admins |
| **Agent** | Never | Admin-provisioned API keys only | Admins |

The type is chosen at creation and is **immutable**. Every user existing before this feature is a `human`.

## Agent users

Agent users represent AI agents acting on the market through the API/MCP:

- They have **no password** — creating an agent with a password is rejected, and both the password login and JWT session paths explicitly refuse agent users, so an agent can never hold an admin session.
- Their **API keys are provisioned by admins** (Users page → row menu → *API keys*): create, list metadata (`last used`, created), and revoke. The plaintext key is shown exactly once at creation.
- Authorization is unchanged: an agent gets exactly the permissions its HRBAC roles grant — the type itself grants or denies nothing.
- An agent user may optionally **operate as** a market actor of the agent type (e.g. "Acme Pricing Agent"), linking authentication identity to market identity. The link is informational in v1 and is cleared automatically if the actor is deleted.

## Lifecycle of an agent

1. Create the agent user (admin, Users page or `POST /users` with `type: "agent"`).
2. Assign roles scoped to what the agent should reach (e.g. `actors:read`, `invoices:read`).
3. Provision an API key (`POST /users/:id/api-keys`) and hand it to the agent.
4. The agent calls the REST API or MCP with `Authorization: Bearer <key>`.
5. Rotate by provisioning a new key and revoking the old one.

`pnpm seed:sample` seeds one example: the "Acme Pricing Agent" user, linked to the actor of the same name, with a read-only role and no key.
