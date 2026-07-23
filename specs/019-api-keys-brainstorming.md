# 019 — API Keys: Brainstorming

> **Goal:** User-owned API keys that allow programmatic access to the Marketlum API, acting with the permissions of their owner — hashed at rest, revealed once at creation, revocable, and usable alongside the existing cookie-JWT session auth.

> **Process:** This document is append-only. Each round of questions is appended below the previous one. For every question, the recommended option is preselected with `[x]`; move the `[x]` to override, and/or write elaboration after `**Answer:**`. Existing content is never edited or deleted.

## Context

What exists today in the relevant area:

- **Auth** lives in `packages/core/src/auth/`: Passport `local` strategy for login, `jwt` strategy reading the token from an httpOnly `token` cookie (`strategies/jwt.strategy.ts`). `JwtStrategy.validate()` loads the full `User` via `UsersService.findOne()`, so `request.user` is always a `User` entity.
- **Guarding** is per-controller: all 31 protected controllers use `@UseGuards(AdminGuard)` where `AdminGuard extends AuthGuard('jwt')` (`guards/admin.guard.ts` — a single line). Widening this one class widens every controller at once.
- **Global guards** (`marketlum-core.module.ts`): `CsrfProtectionGuard` (requires `x-csrf-protection` header on non-GET requests — a cookie-auth defense) and `ThrottlerGuard`.
- **User entity** (`users/entities/user.entity.ts`): id, email, password, name, avatar — no roles; every authenticated user is an admin.
- **Patterns**: Zod schemas in `@marketlum/shared` as single source of truth, `ZodValidationPipe` in controllers, manual TypeORM migrations, domain events emitted per primary entity, strict BDD (`packages/bdd/features/` + step defs in `apps/api/test/`), web admin pages under `apps/web/src/app/admin/` as thin re-exports of `@marketlum/ui`.

The authentication flow being added:

```
                     ┌──────────────────────────────┐
  Browser session    │  Cookie: token=<JWT>          │──► JwtStrategy ──► User
                     └──────────────────────────────┘                     │
                                                                          ▼
                     ┌──────────────────────────────┐              request.user
  Programmatic       │  Authorization: Bearer mlm_… │──► ApiKeyStrategy ──► User
  client             └──────────────────────────────┘    (hash → lookup →
                                                          revoked/expired?)
```

---

## Round 1 — Foundations

This round pins down what an API key *is* in Marketlum: who owns it, what it can do, and how it fits the existing identity model.

### Q1.1 — Ownership model

Who does an API key belong to, and whose permissions does it exercise?

- [x] **User-owned, acts as owner** — key belongs to a `User`, authenticated requests get `request.user` = the owning user; zero changes to downstream authorization since there are no roles today.
- [ ] **System-level keys (no owner)** — keys are global admin credentials managed in system settings; simpler table but loses attribution ("which key did this?" ≠ "who did this?") and orphans nothing on user deletion.
- [ ] **Service accounts** — introduce a new machine-identity entity distinct from users; cleanest long-term but forces a parallel identity model through every controller for a need that doesn't exist yet.

**Answer:**

### Q1.2 — Capability scope for v1

What can an API key do once authenticated?

- [x] **Full access (same as owner)** — key can call everything the owner can, except managing API keys themselves; simplest, matches the no-roles reality, scopes deferred to a future spec.
- [ ] **Read-only vs read-write flag** — a single enum on the key; cheap to add but establishes a half-permission-model that a real scopes spec would have to migrate.
- [ ] **Per-resource scopes now** — granular from day one; large surface (30+ controllers to annotate) for no current requirement.

**Answer:**

### Q1.3 — Key-management privilege boundary

Can a request authenticated *with an API key* manage API keys?

- [x] **No — management is session-only** — `/api-keys` endpoints accept only cookie-JWT auth; a leaked key cannot mint replacement keys or cover its tracks by deleting itself.
- [ ] **Yes — keys are full-access including key management** — one guard everywhere, simpler; but a leaked key becomes self-perpetuating.
- [ ] **Partial — keys can list/revoke but not create** — awkward middle ground, more guard variants to maintain.

**Answer:**

### Q1.4 — How many keys per user

- [x] **Unlimited (soft, no enforced cap)** — users create one key per integration/environment; list UI keeps it manageable; no arbitrary limit to trip over.
- [ ] **Hard cap (e.g. 10)** — bounds abuse but adds a rule, an error case, and a test for little gain in a single-admin tool.
- [ ] **One key per user** — forces rotation-by-replacement; too restrictive for multiple integrations.

**Answer:**

### Q1.5 — Expiration model

- [x] **Optional expiry, default never** — `expiresAt` nullable, settable at creation; expired keys fail auth with 401 but remain listed (marked "Expired") until deleted.
- [ ] **Mandatory expiry (e.g. max 1 year)** — forces hygiene but guarantees surprise breakage of forgotten integrations.
- [ ] **No expiry support at all** — smallest v1, but retrofitting `expiresAt` later costs a migration anyway; the column is cheap now.

**Answer:**

### Q1.6 — Revocation semantics

What happens when a user "removes" a key?

- [x] **Hard delete** — `DELETE /api-keys/:id` removes the row; auth fails immediately because the hash no longer resolves; simplest, matches how every other Marketlum entity is deleted, and the domain event provides an audit trace.
- [ ] **Soft revoke (`revokedAt`), delete separately** — keeps a tombstone for audit; but Marketlum has no soft-delete pattern anywhere, and "revoked but still listed" adds a state users must then clean up.
- [ ] **Soft revoke only, no delete** — rows accumulate forever.

**Answer:**

### Q1.7 — Domain events

Should API keys participate in the domain-event bus like the 24 primary entities?

- [x] **Yes — `marketlum.api_key.created` / `deleted`** — consistent with the spec-009 pattern; gives plugins/audit hooks visibility into credential lifecycle (payload carries id/name/prefix, never the hash).
- [ ] **No events** — keys are infrastructure, not domain; but credential lifecycle is exactly what an audit-minded subscriber wants to see.

**Answer:**

---

## Round 2 — Shape

Round 1 accepted as recommended. This round fixes the concrete form of the key: token format, storage, entity fields, and usage tracking.

### Q2.1 — Token format

What does the plaintext key look like?

```
mlm_hGx82... (43 chars of base64url)      → total ~47 chars
```

- [x] **`mlm_` + 32 random bytes base64url** — recognizable prefix enables secret-scanning and log-grepping; 256 bits of entropy; single fixed format.
- [ ] **`mlm_live_` / `mlm_test_` environment prefixes** — Stripe-style; but Marketlum has no environment concept, so the distinction would be decorative.
- [ ] **Raw UUID v4** — trivially generatable but only 122 bits, no recognizable prefix, looks like every other id in logs.

**Answer:**

### Q2.2 — Hash algorithm at rest

- [x] **SHA-256, single deterministic hash** — the key is high-entropy random so slow hashing adds nothing; deterministic hash allows `WHERE keyHash = $1` on a unique index — O(1) lookup per request.
- [ ] **bcrypt (like passwords)** — misapplied here: forces loading candidate rows and comparing one-by-one per request, since bcrypt output isn't queryable; the work factor defends against dictionary attacks that 256-bit random keys don't face.
- [ ] **SHA-256 with per-key salt** — salt defends rainbow tables, which are irrelevant at 256 bits of entropy; breaks direct lookup for no gain.

**Answer:**

### Q2.3 — Display identifier for the list UI

After creation the plaintext is gone. How do users recognize a key in the list?

- [x] **Store `prefix` = first 12 chars (`mlm_` + 8)** — shown as `mlm_hGx82f3a…`; enough to match against a key in a config file; name remains the primary identifier.
- [ ] **Name only, no prefix** — cleaner table but users can't match a leaked/found key string back to a row.
- [ ] **Store last 4 chars instead** — card-number convention; prefix-start is the norm for API keys (GitHub, Stripe) and greps better.

**Answer:**

### Q2.4 — Entity fields

Proposed `api_keys` table:

| column      | type          | notes                                  |
|-------------|---------------|----------------------------------------|
| id          | uuid PK       |                                        |
| name        | varchar       | required, e.g. "Zapier integration"    |
| prefix      | varchar(12)   | display only                           |
| keyHash     | varchar(64)   | SHA-256 hex, **unique index**          |
| userId      | uuid FK→users | CASCADE on user delete                 |
| lastUsedAt  | timestamptz   | nullable                               |
| expiresAt   | timestamptz   | nullable                               |
| createdAt   | timestamptz   |                                        |
| updatedAt   | timestamptz   |                                        |

- [x] **As proposed** — minimal but complete for Q1 decisions; `ON DELETE CASCADE` means deleting a user kills their keys' access instantly.
- [ ] **Add `description` text field** — name is enough at this scale; add later if names prove insufficient.
- [ ] **Add `scopes` jsonb now (unused)** — speculative column for a deferred spec; migrations are cheap, dead columns confuse.

**Answer:**

### Q2.5 — `lastUsedAt` update strategy

- [x] **Throttled fire-and-forget: update only if older than 60s** — one extra write per key per minute max; `.catch(() => {})` so a failed touch never breaks the request; precise enough for "is this key still used?".
- [ ] **Update on every authenticated request** — a write per request on the hot path; the precision buys nothing.
- [ ] **Don't track usage** — loses the one signal users need before deleting a key ("is anything still using this?").

**Answer:**

### Q2.6 — Name uniqueness & validation

- [x] **Name required, 1–100 chars, no uniqueness constraint** — duplicate names are the user's own foot-gun, not a data-integrity issue; matches how other Marketlum entities treat names; Zod `createApiKeySchema` in `@marketlum/shared` enforces shape, optional `expiresAt` must be a future datetime.
- [ ] **Unique per user** — adds a 409 path and a test for marginal benefit.
- [ ] **Name optional, auto-generate** — auto-names ("Key 3") end up meaningless; requiring intent is the feature.

**Answer:**

---

## Round 3 — UI / UX

Round 2 accepted as recommended. This round decides where key management lives in the admin and how the create-reveal-revoke flow feels. Context: the sidebar (`packages/ui/src/layouts/admin-layout.tsx`) has a **System** group (Users, Taxonomies, …, Plugins); admin pages in `apps/web` are thin re-exports of `@marketlum/ui` pages.

### Q3.1 — Where does key management live?

- [x] **`/admin/api-keys` — own page in the System sidebar group** — consistent with every other entity (Users, Plugins, …); one obvious place; icon e.g. `KeyRound`.
- [ ] **Tab inside the current user's profile/user detail page** — semantically "my keys", but Marketlum has no profile page today, so this builds new chrome for one tab.
- [ ] **Section on the Users detail page** — puts *my* credentials under a generic user-management screen; confusing ownership signal.

**Answer:**

### Q3.2 — Whose keys does the page show?

Every authenticated user is an admin today (no roles).

- [x] **Own keys only** — a credential is personal; the API scopes all queries to `request.user.id`, so there's no "manage someone else's secret" path; Users page can later gain a read-only key count if oversight is needed.
- [ ] **All keys, with owner column** — full admin oversight, but lets any admin delete another admin's integration credentials silently, and widens every endpoint's semantics.
- [ ] **Own by default + "show all" toggle** — two modes to build and test for an oversight need nobody has voiced.

**Answer:**

### Q3.3 — Create & reveal flow

```
[Create API key] → dialog: name, optional expiry → POST →
┌────────────────────────────────────────────┐
│ ✓ Key created                              │
│ mlm_hGx82f3a9Kp…            [Copy]         │
│ ⚠ This is the only time the full key is    │
│   shown. Store it somewhere safe.          │
│                              [Done]        │
└────────────────────────────────────────────┘
```

- [x] **Two-step dialog: form → one-time reveal with copy button** — the standard pattern (GitHub/Stripe); reveal state is unmissable; closing the dialog is the explicit "I've stored it" act.
- [ ] **Reveal inline in the list row after create** — the secret lingers on screen and in the DOM until refresh; easy to screenshot accidentally.
- [ ] **Email the key to the user** — puts the secret in a second system (mailbox) permanently; strictly worse.

**Answer:**

### Q3.4 — List table columns

- [x] **Name · Key (prefix, monospace `mlm_hGx82f3a…`) · Last used (relative, "—" if never) · Expires (date or "Never", red "Expired" badge past due) · Created · row action: Delete** — everything needed to answer "what is this and is it safe to delete?"; TanStack Table like other entity lists.
- [ ] **Minimal: Name · Created · Delete** — hides exactly the signals (last used, expiry) that make deletion decisions safe.
- [ ] **Add owner column** — moot under Q3.2 own-keys-only recommendation.

**Answer:**

### Q3.5 — Delete confirmation

- [x] **Standard confirm dialog naming the key** — "Delete 'Zapier integration'? Requests using this key will fail immediately." — matches the delete UX of other Marketlum entities; hard delete (Q1.6) deserves an explicit confirm but not more friction.
- [ ] **Type-the-name-to-confirm (GitHub danger style)** — heavyweight for a credential the owner can recreate in ten seconds.
- [ ] **No confirmation, undo toast** — undo can't work: the plaintext is unrecoverable, so a re-created key is a *different* key.

**Answer:**

### Q3.6 — Expiry input in the create form

- [x] **Optional date picker, empty = never** — plus quick presets (30/90/365 days) as convenience buttons that fill the picker; one field, no mode switch.
- [ ] **Dropdown of durations only (no custom date)** — simpler but arbitrary restriction; someone will want "end of contract, March 31".
- [ ] **Omit expiry from the form in v1** — contradicts Q1.5 (optional expiry accepted); the column would be unreachable.

**Answer:**

---

## Round 4 — Integration, security, delivery

Round 3 accepted as recommended. Final round: how the new strategy plugs into the existing guard/CSRF/throttler stack, seeding, and how the work ships.

### Q4.1 — Guard integration

- [x] **Widen `AdminGuard` to `AuthGuard(['jwt', 'api-key'])`; add `SessionGuard extends AuthGuard('jwt')` for the `/api-keys` controller** — one-line change gives all 31 existing controllers API-key support (passport tries strategies in order); the new session-only guard exists solely for key management (Q1.3). No controller edits.
- [ ] **New `ApiOrSessionGuard`, applied controller-by-controller** — explicit opt-in, but 31 mechanical edits and a guarantee that future controllers forget it.
- [ ] **Global `APP_GUARD`** — breaks the existing per-controller pattern and complicates the public auth endpoints (login/logout).

**Answer:**

### Q4.2 — CSRF exemption for API-key requests

`CsrfProtectionGuard` (global) currently 403s any non-GET request lacking `x-csrf-protection`. API clients don't carry cookies, so CSRF doesn't apply to them.

- [x] **Skip the CSRF check when an `Authorization` header is present** — a cross-site form/fetch cannot attach an `Authorization` header, so the exemption is exactly as safe as the header check itself; API clients get clean single-header auth.
- [ ] **Require API clients to also send `x-csrf-protection`** — zero code change but a pointless second header that every integration doc must explain; confuses "why does a curl need CSRF?".
- [ ] **Skip CSRF only when the token validates as an API key** — requires the CSRF guard to run after/inside auth, inverting the current guard order for marginal strictness.

**Answer:**

### Q4.3 — Throttling & brute-force posture

- [x] **Rely on the existing global `ThrottlerGuard`; no per-key throttling** — 256-bit keys are not guessable within any rate limit; failed lookups are a single indexed miss; add nothing.
- [ ] **Stricter throttle bucket for requests with `mlm_` bearer tokens** — extra config and tests defending against an attack (key guessing) that entropy already defeats.
- [ ] **Lockout after N failed key attempts per IP** — state to store, admin to unlock, DoS vector against shared NATs.

**Answer:**

### Q4.4 — Seed data

- [x] **No API keys in `seed:sample`** — a seeded key's plaintext would have to be printed or fixed (a known credential in every dev DB); keys are created interactively in seconds; BDD tests create their own.
- [ ] **Seed one key with a fixed well-known value for dev convenience** — handy for local curl, but normalizes a hardcoded credential and would need excluding from any non-dev path.
- [ ] **Seed key metadata only (unusable hash)** — populates the list UI for demos but the rows are dead weight.

**Answer:**

### Q4.5 — BDD coverage

Proposed feature files in `packages/bdd/features/api-keys/` (step defs in `apps/api/test/api-keys/`):

```
management.feature   (~7): create returns plaintext once (mlm_ prefix, shown never again);
                           list shows name/prefix/lastUsedAt/expiresAt but never hash or key;
                           list scoped to own keys; delete own key; delete another user's
                           key → 404; validation errors (empty name, past expiresAt) → 400
authentication.feature (~8): valid key on protected endpoint → 200 with owner identity;
                           unknown/malformed key → 401; expired key → 401; deleted key →
                           401 immediately; mutation with key + no CSRF header → succeeds;
                           key auth on /api-keys endpoints → 401/403; cookie session still
                           works unchanged; lastUsedAt set after use
```

- [x] **As proposed (~15 scenarios across 2 files)** — covers the credential lifecycle and every auth boundary decided in Rounds 1–3.
- [ ] **Single combined feature file** — fewer files but mixes management CRUD with auth-boundary concerns; harder to read as documentation.
- [ ] **Add UI e2e tests too** — the project's convention (per feedback memory) is API-level BDD + `tsc`/`next build` verification for web; no browser e2e infrastructure exists.

**Answer:**

### Q4.6 — Delivery plan

- [x] **Single PR, spec order: shared schemas → entity+migration → service+strategy+guards → controller → BDD green → UI page + sidebar + template sync** — the feature is cohesive and small enough (~1 entity, 3 endpoints, 1 page); template sync check for the new `apps/web/src/app/admin/api-keys` re-export is called out in the spec.
- [ ] **Two PRs: backend then UI** — API-key auth without a way to create keys via UI is shippable but pointless to review separately at this size.
- [ ] **Three PRs (schema/backend/UI)** — process overhead exceeding the feature.

**Answer:**
