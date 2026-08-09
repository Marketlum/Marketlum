# 025 — User Types: Human and Agent

> **Goal:** Introduce two User types — Human and Agent — so that AI agents interacting with the market through the API/MCP can be distinguished from human users.

> **Process:** Append-only brainstorming. Questions are added in rounds; answers are recorded beneath each question. Existing content is never edited or deleted. Move the `[x]` to change a selection, and/or write after **Answer:** to elaborate.

## Context

- **`User`** (`packages/core/src/users/entities/user.entity.ts`): `email` (unique), `password`, `name`, optional `avatar`, M:N `roles` (HRBAC, spec 020/021). No type/kind column today.
- **`ApiKey`** (spec 019) belongs to a `User` (`userId` FK). The MCP endpoint (`POST /mcp`, spec 023) authenticates **exclusively** via API keys, so today an "AI agent" is indistinguishable from its owning human user — requests attribute to whichever user owns the key.
- **Not to be confused with `ActorType.AGENT`** (spec 024/f65ab20): Actors are *market participants* (domain entities); Users are *authentication identities* operating the admin/API. This spec is about the latter.
- Auth chain today:

```
  Human ──password──▶ User ──JWT cookie──▶ web admin
                        │
                        └─owns─▶ ApiKey ──Authorization header──▶ REST API / MCP
```

- Domain events emit `marketlum.user.*` for user CRUD; users appear in the admin Users page with role assignment.

---

## Round 1 — Foundations

This round pins down what a "user type" is structurally, how agent users authenticate, and how the concept relates to what already exists.

**Q1. How should the type be modeled?**

- [x] **Enum column `type` on `users`** (`human` | `agent`, default `human`) &mdash; mirrors `ActorType` on actors; one migration, trivial queries, no joins.
- [ ] **Separate `agent_profiles` table 1:1 with users** &mdash; room for agent-specific fields later, but speculative today; joins everywhere for one bit of information.
- [ ] **Marker role (e.g. an "Agent" HRBAC role)** &mdash; no schema change, but conflates *what you are* with *what you may do*; roles are editable, identity shouldn't be.

**Answer:**

**Q2. How do Agent users authenticate?**

- [x] **API keys only — no password login** &mdash; agent users get `password = NULL` and the local (password) strategy rejects them; the web admin stays human-only. Matches how MCP already works (API-key-only).
- [ ] **Same as humans (password + API keys)** &mdash; type is purely informational; simplest, but an "agent" with a working web login undermines the distinction.
- [ ] **API keys + optional password** &mdash; flexible, but ambiguous: nobody can say what a logged-in agent session means.

**Answer:**

**Q3. What happens to existing users on migration?**

- [x] **All become `human`** &mdash; the enum defaults to `human`; no data backfill decisions needed. Any real agent users are created after the feature ships.
- [ ] **Heuristic backfill (e.g. users owning API keys become agents)** &mdash; wrong: today humans own keys for scripts/tests; would misclassify the admin user.

**Answer:**

**Q4. Should an Agent user link to an Actor (the market-participant kind, `ActorType.AGENT`)?**

- [x] **Optional `actorId` link (nullable FK)** &mdash; lets an agent user *operate as* a specific market actor (e.g. "Acme Pricing Agent"), which is the natural end-state for agentic market participation; nullable so infrastructure agents need no actor.
- [ ] **No link in v1** &mdash; smallest scope; but the link is cheap now and painful to retrofit into attribution queries later.
- [ ] **Required link** &mdash; forces every agent user to have a market identity; too strict for utility agents (monitoring, exports).

**Answer:**

**Q5. Where are Agent users created and managed?**

- [x] **Admin Users page (existing UI, type picker at creation)** &mdash; one place to manage all identities; type is immutable after creation (identity, not preference).
- [ ] **Dedicated "Agents" admin page** &mdash; clearer mental model but duplicates the users table UI for one column's difference.
- [ ] **API-only creation** &mdash; no UI cost, but hides agents from the admin, which defeats the "distinguish" goal.

**Answer:**

**Q6. Does the type affect authorization?**

- [x] **No — HRBAC roles remain the sole authority** &mdash; type is identity metadata; an agent gets exactly the permissions its roles grant, same as a human. Keeps the two systems orthogonal.
- [ ] **Agent-specific permission ceiling (e.g. read-only cap)** &mdash; tempting safety net, but duplicates what a properly-scoped role already expresses; two authorities create confusing denials.

**Answer:**

---

## Round 2 — Shape

This round nails the mechanics: creation flow without passwords, key provisioning for identities that cannot log in, defensive auth boundaries, and where the type surfaces.

**Q7. How does the create-user contract handle the password for each type?**

- [x] **Discriminated schema: `password` required for `human`, forbidden for `agent`** &mdash; a Zod refinement on `createUserSchema` (`type: 'agent'` + password present → 400, and vice versa); the DB column becomes nullable. Invalid states are unrepresentable at the boundary.
- [ ] **Password optional for everyone** &mdash; simpler schema, but permits a passwordless human (locked-out account) and relies on service-layer checks.
- [ ] **Generate a random throwaway password for agents** &mdash; keeps the column NOT NULL, but a secret nobody knows is still a working credential — worse than none.

**Answer:**

**Q8. Agent users cannot log in — who provisions their API keys? (Today `/api-keys` is strictly self-service: create/list/delete "my keys" from a session.)**

- [x] **Admin-managed keys: `users:write` admins create/list/revoke keys *for* an agent user** (`POST/GET/DELETE /users/:id/api-keys`, agent-type targets only) &mdash; mirrors the on-behalf pattern; plaintext still shown exactly once, to the provisioning admin.
- [ ] **Return a bootstrap key once at agent creation** &mdash; fewer endpoints, but one unrotatable key per agent; rotation then needs the admin flow anyway.
- [ ] **Relax `/api-keys` to accept a target userId** &mdash; fewer routes but muddies a clean self-service contract with conditional admin semantics.

**Answer:**

**Q9. Should auth strategies defensively reject agents even though they have no password?**

- [x] **Yes — belt and braces**: local strategy rejects `type = 'agent'` explicitly (not just NULL-password mismatch), and the JWT strategy refuses to validate a cookie for an agent user &mdash; two cheap guards making "agents never hold sessions" an invariant rather than an accident.
- [ ] **No — NULL password is sufficient** &mdash; bcrypt can never match NULL, but the invariant then rests on an implementation detail nobody asserts.

**Answer:**

**Q10. What does the `actorId` link validate and imply?**

- [x] **Must reference an actor of `ActorType.AGENT`; informational otherwise** &mdash; validated on create/update like `functionalCurrencyId` validates `type = 'currency'`; `ON DELETE SET NULL`. No behavioral coupling yet (attribution queries can join later).
- [ ] **Any actor type allowed** &mdash; flexible, but "operates as" pointing at a human-shaped organization actor is a modeling smell.
- [ ] **Link plus behavioral coupling now (e.g. MCP responses scoped to that actor)** &mdash; scope explosion; belongs in a future spec.

**Answer:**

**Q11. Where does the type surface in existing read APIs and events?**

- [x] **Everywhere the user object already appears** &mdash; `type` (and `actorId`) join `userResponseSchema`, `/auth/me`, the admin users list/detail, and `marketlum.user.*` event payloads automatically via the entity. One shape, no special cases.
- [ ] **Users endpoints only, keep events unchanged** &mdash; avoids event-consumer churn, but event consumers are exactly who needs to distinguish agent activity.

**Answer:**

**Q12. Seed data?**

- [x] **`pnpm seed:sample` adds one agent user linked to a seeded agent-type actor** (e.g. "Acme Pricing Agent" the user, operating as the actor of the same name), no API key &mdash; keys are hashed at rest and a printed plaintext seed key would rot in docs; admins provision real keys via Q8's flow.
- [ ] **No seed changes** &mdash; smallest diff, but the demo dataset then never shows the feature.
- [ ] **Seed agent user + printed bootstrap key** &mdash; convenient for local MCP testing but normalizes plaintext keys in terminal history.

**Answer:**

---

## Round 3 — UI / UX

This round decides how the distinction looks and where agent-specific affordances live. Today: `users-page.tsx` (list + `user-form-dialog` + `manage-roles-dialog` + `change-password-dialog`), and a separate self-service `api-keys-page.tsx`.

**Q13. How do agents stand out in the users list?**

- [x] **Type badge column + type filter** &mdash; a `UserTypeBadge` (mirroring `ActorTypeBadge`) in `users/columns.tsx` plus a Human/Agent filter dropdown next to search; consistent with how actor types are shown elsewhere.
- [ ] **Badge only, no filter** &mdash; fine at 10 users, unhelpful at 200.
- [ ] **Separate tabs (Humans | Agents)** &mdash; splits one identity list into two views; makes "all users" the exception.

**Answer:**

**Q14. How does the create dialog handle the two types?**

- [x] **Type selector at the top of `user-form-dialog`; fields adapt** &mdash; `human` shows the password field, `agent` replaces it with an optional agent-actor select (only `ActorType.AGENT` actors offered). Edit mode shows the type read-only (immutable per Q5).
- [ ] **Separate "Create Agent" button + dedicated dialog** &mdash; clearer entry point but two dialogs to keep in sync with every future user-field change.

**Answer:**

**Q15. Where does the admin manage an agent's API keys (Q8)?**

- [x] **Keys section on the agent's row expansion / detail area of the Users page** &mdash; create (plaintext shown once), list metadata (`lastUsedAt`, prefix), revoke; rendered only for agent-type users. The self-service `api-keys-page.tsx` stays untouched for humans.
- [ ] **Extend the existing API Keys page with an admin "all agents' keys" view** &mdash; centralizes keys but mixes self-service and admin-on-behalf semantics in one screen.

**Answer:**

**Q16. Visual identity for agent users?**

- [x] **`Bot` lucide icon + neutral badge** &mdash; distinct from actors' `Drama`; used in the badge, dialog type selector, and beside the avatar placeholder on agent rows (agents keep the avatar field — an image humanizes dashboards, and the entity already has it).
- [ ] **Reuse the actors' agent styling** &mdash; visually ties users to actors, but the whole spec exists to keep those concepts distinct.

**Answer:**

---

## Round 4 — Integration, security, delivery

Final round: what the rest of the system sees, how it's tested, and how it ships.

**Q17. Should agent-keyed API/MCP requests surface the agent identity anywhere new in v1?**

- [x] **No new surfaces — the data model is the deliverable** &mdash; every request already resolves key → user, and the user now carries `type`/`actorId`; `lastUsedAt` keeps working. Attribution dashboards/log enrichment are a future spec with real requirements.
- [ ] **Add user type to MCP `initialize` metadata** &mdash; tells the agent what it is; costs contract churn for information the caller already knows.
- [ ] **Structured request log line with user type** &mdash; useful ops-wise, but logging strategy deserves its own decision, not a rider.

**Answer:**

**Q18. BDD coverage — agree the scenario map?**

- [x] **Five feature files, ~16 scenarios** &mdash;
  | Feature file | Scenarios |
  |---|---|
  | `users/user-types.feature` | create agent (no password) 201; create agent *with* password 400; create human *without* password 400; type immutable on PATCH 400; existing create-user scenarios keep passing (default human) |
  | `users/agent-actor-link.feature` | link to agent-type actor 201; link to organization actor 400; actor deletion nulls the link |
  | `auth/agent-login-rejected.feature` | password login for agent 401; forged JWT cookie for agent user rejected |
  | `users/agent-api-keys.feature` | admin creates key for agent (plaintext once) 201; create for a *human* target 400; list metadata; revoke; non-admin 403 |
  | `mcp/agent-key-works.feature` | MCP tool call with an agent user's key succeeds under the agent's role grants |
- [ ] **Minimal (create + login-rejection only)** &mdash; leaves the admin-key flow — the riskiest new surface — untested.

**Answer:**

**Q19. Documentation & compatibility posture?**

- [x] **Docs updated; no UPGRADE.md entry** &mdash; users concept + API-keys/MCP docs pages gain the agent story. The change is additive: existing clients omit `type` → default `human`, password rules unchanged for them; event payloads gain fields (additive). Template sync: users/api-keys admin routes are thin re-exports — verify, expect no template change.
- [ ] **Treat as breaking, add UPGRADE.md entry** &mdash; honest if we consider event-shape additions breaking, but the repo hasn't treated additive fields that way before.

**Answer:**

**Q20. Delivery?**

- [x] **Single PR, phased commits** &mdash; shared contracts → migration → auth guards → admin key routes → UI → seeds/docs; each phase compiles and its tests pass. The feature is one coherent unit (~16 scenarios, one migration).
- [ ] **Two PRs (backend, then UI)** &mdash; smaller reviews, but the backend PR ships an invisible feature and the UI PR can't be tested without it.

**Answer:**
