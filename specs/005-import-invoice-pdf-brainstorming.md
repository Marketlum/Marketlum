# Import Invoice from PDF — Brainstorming

> **Goal:** Let an admin upload an invoice PDF and have the system pre-fill the Invoice creation form with the extracted data (number, parties, dates, currency, line items).
>
> **Process:** One round of questions at a time. The user appends answers below each question. Existing content is never modified.

## Context

The relevant pieces already in place:

- `POST /files/upload` — generic multer-backed upload using memory storage. Returns a `File` row with id/mime/size.
- `POST /invoices` — Zod-validated create endpoint accepting `{ number, fromAgentId, toAgentId, issuedAt, dueAt, currencyId, items[...], valueStreamId?, channelId?, fileId? }`.
- `Invoice.fileId` already an optional FK; the existing form lets admins attach a source PDF after the fact.
- `Agent`, `Value` (currency), `ValueInstance` lookups all live behind admin-only endpoints.
- No Anthropic SDK installed; no AI integration today.
- Spec 002&apos;s `system_settings` table exists for storing single key/value rows (used for `base_value_id`).

```
┌────────────────────┐                          ┌─────────────────────┐
│  Admin uploads     │  PDF (multipart/file)    │  Backend            │
│  invoice PDF       │ ───────────────────────▶ │  /invoices/import   │
└────────────────────┘                          │                     │
                                                │  ┌───────────────┐  │
                                                │  │ Claude API    │  │
                                                │  │ (vision)      │  │
                                                │  └───────────────┘  │
                                                │         │           │
                                                │  parsed JSON        │
                                                │  + best-match IDs   │
                                                └─────────┬───────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────────┐
                                                │  Pre-filled Invoice  │
                                                │  create form         │
                                                └──────────────────────┘
```

---

## Round 1 &mdash; Foundations

This round nails down where Import lives, what the backend flow looks like, and how extracted data is mapped onto existing entities.

### Q1.1 &mdash; Where does the &ldquo;Import from PDF&rdquo; entry point live in the UI?

- [x] **A new &ldquo;Import from PDF&rdquo; button next to &ldquo;Create Invoice&rdquo; on `/admin/invoices`** &mdash; opens a file picker; on upload the existing `InvoiceFormDialog` opens with fields pre-filled. Minimal UI surface; one new button.
- [ ] **A dedicated `/admin/invoices/import` page** with drop-zone + review step before form opens &mdash; more guided UX; one new route.
- [ ] **A small &ldquo;Import from PDF&rdquo; section inside the existing `InvoiceFormDialog`** that prepopulates the rest of the dialog &mdash; tight integration; modal-in-modal can feel cramped.

**Answer:**

### Q1.2 &mdash; What is the backend flow?

- [x] **`POST /invoices/import` (multipart)** &mdash; server reads the PDF buffer, calls Claude API server-side, returns parsed + best-matched JSON. PDF is *also* uploaded as a `File` row in the same request and its id is returned so the user can attach it to the saved invoice. One round-trip from the browser.
- [ ] **Two-step: `POST /files/upload` first, then `POST /invoices/import?fileId=...`** &mdash; reuses generic upload; the import endpoint just reads the file by id. Two HTTP requests; cleaner separation but slower.
- [ ] **Client-side: browser calls Claude API directly** &mdash; zero new backend work; API key would have to be exposed (bad) or proxied (cancels the simplicity gain).

**Answer:**

### Q1.3 &mdash; Is the source PDF stored?

- [x] **Always stored as a `File` and the import response includes `fileId`** so the form pre-fills `fileId` too &mdash; consistent with the existing optional-attachment pattern; gives the admin an audit trail.
- [ ] **Stored only if the admin confirms (saves the invoice)** &mdash; cleaner if they abandon, but the file is transient on the server until then.
- [ ] **Never stored &mdash; PDF is only used for extraction** &mdash; minimal storage; loses the source document.

**Answer:**

### Q1.4 &mdash; How does Claude&apos;s output get mapped to existing entities (agents, currency, values)?

Claude returns names / strings; the form needs UUIDs.

- [x] **Server-side best-effort lookup by exact name match (case-insensitive trimmed)** for `fromAgent`, `toAgent`, `currency`. Unmatched values are returned as `{ name, id: null }` and the form opens with the name in the picker placeholder + an inline hint &ldquo;Couldn&apos;t find this in your records &mdash; pick one&rdquo;. No auto-create.
- [ ] **Same lookup, but auto-create missing agents / values** so the form opens fully populated &mdash; faster path; risks creating duplicates from variant spellings.
- [ ] **Return raw strings only; the form does fuzzy matching client-side** &mdash; keeps server simpler; pushes complexity to the form.

**Answer:**

### Q1.5 &mdash; Line items: what about each row&apos;s `valueId` (the &ldquo;what was sold&rdquo;)?

`InvoiceItem.valueId` is optional today. Most PDFs don&apos;t map cleanly to existing Value rows.

- [ ] **Leave `valueId` null for every imported item; admin links manually after import** &mdash; safest; matches the schema&apos;s optional FK; faster to ship.
- [x] **Server attempts exact-name match for each line description; leaves null on miss** &mdash; useful when the admin has a small catalogue; brittle for general invoices.
- [ ] **Auto-create a new `Value` for each unmatched line item** &mdash; aggressive; produces value-catalogue pollution from one-off invoices.

**Answer:**

### Q1.6 &mdash; What does the admin see before confirming the import?

- [x] **The existing `InvoiceFormDialog` opens pre-filled** &mdash; every field is editable, the admin reviews and clicks Save. No separate &ldquo;preview&rdquo; step; reuses the existing form for validation.
- [ ] **A dedicated review screen** with extracted data on the left and the PDF on the right (PDF.js renderer) &mdash; very polished; significant UI work; would replace step 1 of `/admin/invoices/import`.
- [ ] **A toast &ldquo;3 fields extracted, 2 couldn&apos;t be matched&rdquo; followed by the form** &mdash; lightweight cue + same form; small ergonomic win.

**Answer:**

### Q1.7 &mdash; Where does the Claude API key come from?

- [x] **`ANTHROPIC_API_KEY` env var read in the import service** &mdash; standard pattern for third-party credentials; never hits the DB; documented in the README. Same approach as JWT_SECRET, database creds, etc.
- [ ] **Stored in `system_settings`** (spec 002 pattern) &mdash; admin-editable from the UI; nice for self-hosted setups; secrets-in-DB is uncomfortable.
- [ ] **Both: env var wins; fall back to `system_settings`** &mdash; flexible; double surface.

**Answer:**

---

When you&apos;ve answered (or accepted the recommendations), reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 2 &mdash; Shape (prompt design, response schema, error paths, model/cost).

---

## Round 2 &mdash; Shape

Round 1 set the where/what. This round defines the model, the prompt&apos;s response shape, and the error/edge-case handling.

### Q2.1 &mdash; Which Claude model?

| model | input/output (per Mtok) | accuracy on invoices | latency |
|---|---|---|---|
| Sonnet 4.6 | $3 / $15 | high | 2&ndash;6s |
| Opus 4.7  | $15 / $75 | highest | 4&ndash;12s |
| Haiku 4.5 | $1 / $5 | acceptable for clean layouts | 1&ndash;3s |

A typical 1&ndash;2 page invoice with vision: ~5k input tokens, ~500 output tokens.

- [ ] **Sonnet 4.6** &mdash; sweet-spot for cost/accuracy on document parsing; ~$0.02&ndash;0.04 per invoice. Tune-able later.
- [ ] **Opus 4.7** &mdash; best accuracy on tricky / dense layouts; ~$0.10&ndash;0.15 per invoice. Worth it if extraction is mission-critical.
- [ ] **Haiku 4.5** &mdash; cheapest (~$0.005&ndash;0.01) and fastest; meaningful accuracy drop on multi-line or non-English invoices.
- [x] **Make the model name configurable via env** (`ANTHROPIC_MODEL` with a sensible default) &mdash; flexibility; one extra env var.

**Answer: Go with Opus 4.7 by default if env var is not set.**

### Q2.2 &mdash; How is the PDF sent to Claude?

The Anthropic Messages API accepts PDF natively (`type: 'document'`, base64-encoded, up to 32 MB and 100 pages).

- [x] **Native `document` content block** &mdash; one API call; Claude handles text + vision internally; preserves layout cues; no extra deps. Cost is per-page (vision tokens).
- [ ] **Render PDF to PNGs server-side (`pdf2image` or similar), send as image blocks** &mdash; finer control; extra native dep (poppler/imagemagick) and ~50 lines of code; rarely a quality win over native.
- [ ] **Extract text with `pdf-parse` and send a text-only message** &mdash; cheapest (~10&times; lower tokens); breaks on scanned / image-only PDFs.

**Answer:**

### Q2.3 &mdash; What JSON shape does the prompt ask Claude to return?

We&apos;ll instruct Claude to produce exactly this shape, validated server-side with a Zod schema:

```jsonc
{
  "number": "INV-2026-0042",
  "issuedAt": "2026-05-10",                 // ISO date, may be null
  "dueAt":    "2026-06-10",                 // ISO date, may be null
  "fromAgent": { "name": "Acme Corp" },     // raw name; backend resolves id
  "toAgent":   { "name": "Marketlum" },
  "currency":  { "name": "USD" },           // ISO code or full name
  "items": [
    {
      "description": "Consulting services",
      "valueName":   "Consulting services", // same as description for matching
      "quantity":    "10",                  // decimal string, 2 dp
      "unitPrice":   "150.00",
      "total":       "1500.00"
    }
  ],
  "notes": "Net 30. Bank transfer only."    // free text, may be null
}
```

- [x] **This shape** &mdash; mirrors the existing `createInvoiceSchema` fields; minimal mapping in the service; line items carry both `description` and `valueName` so we can match by either.
- [ ] **Flatter shape** (no nested `fromAgent`/`currency` objects, raw strings instead) &mdash; one fewer step to read; loses the &ldquo;here&apos;s a name *plus* maybe an id&rdquo; framing for the response payload.
- [ ] **Include a per-field `confidence` (low/medium/high)** &mdash; admins see which fields to scrutinize; Claude&apos;s self-reported confidence is noisy; deferred to a follow-up.

**Answer:**

### Q2.4 &mdash; What does the response shape from `POST /invoices/import` look like?

The endpoint returns:

```ts
{
  fileId: string,                            // the stored PDF
  extracted: {
    number: string | null,
    issuedAt: string | null,                 // ISO
    dueAt: string | null,                    // ISO
    fromAgent: { name: string, id: string | null },
    toAgent:   { name: string, id: string | null },
    currency:  { name: string, id: string | null },
    items: Array<{
      description: string,
      quantity: string,
      unitPrice: string,
      total: string,
      value: { name: string, id: string | null } | null,
    }>,
    notes: string | null,
  },
  warnings: string[],                        // human-readable: "currency not matched", "0 items"
}
```

- [x] **This shape (extracted + warnings)** &mdash; clear separation of raw extraction vs. resolved IDs; warnings drive the inline hints in the form.
- [ ] **Flatter: return a `CreateInvoiceInput` directly** with `null` for unmatched ids &mdash; closer to the form&apos;s native shape but harder to render &ldquo;match status&rdquo; per field.
- [ ] **Two endpoints: one returns extraction, a second resolves IDs** &mdash; over-engineered for v1.

**Answer:**

### Q2.5 &mdash; What happens when Claude returns invalid JSON or extraction fails?

Even with strict prompting, Claude can occasionally produce malformed output.

- [x] **422 Unprocessable Entity with `{ message, rawText }`** &mdash; the form shows a toast &ldquo;Couldn&apos;t parse the PDF&rdquo;; the admin can re-upload or fall back to filling the form manually. The PDF is *not* persisted on failure (no orphan files).
- [ ] **One server-side retry with a stricter prompt, then 422** &mdash; ~2&times; latency on the unhappy path; meaningfully higher success rate.
- [ ] **Always succeed: return empty `extracted` + warning** &mdash; never blocks the admin; loses the signal that something went wrong.

**Answer:**

### Q2.6 &mdash; File constraints

- [x] **Accept only `application/pdf`, max 10 MB, soft limit on pages (warn at 20+, hard fail at 100)** &mdash; matches Anthropic&apos;s API limits with margin; rejects non-PDFs early.
- [ ] **Accept PDFs and images (`image/jpeg`, `image/png`)** so scanned invoices that are *already* images skip the PDF step &mdash; broader reach; user education needed about which to upload.
- [ ] **PDFs only, but accept up to 32 MB / 100 pages** (Anthropic max) &mdash; permissive; one bad upload can spike cost ($0.50+ per call) and latency (15&ndash;30s).

**Answer:**

### Q2.7 &mdash; Cost cap / observability

Real users could mistakenly upload a 100-page deck. Some safety rails:

- [x] **Hard fail before calling Claude** if `pageCount > 50` *or* `size > 10 MB`; log every call&apos;s input/output tokens and computed cost to the API logs &mdash; bounded blast radius; visible spend.
- [ ] **Plus a per-admin daily rate limit** (e.g., 20 imports/day) via the existing `@nestjs/throttler` &mdash; defensive against runaway usage / abuse.
- [ ] **No cap; trust the admin** &mdash; minimal code; one bad upload could cost $1+.

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 3 &mdash; UI / UX &amp; Delivery (form prefill mechanics, warnings rendering, BDD scope, PR shape).

---

## Round 3 &mdash; UI / UX &amp; Delivery

Final round. Covers how the form receives extracted data, how unmatched fields are shown, loading/error feedback, test mocking, and PR shape.

### Q3.1 &mdash; How does `InvoiceFormDialog` receive the extracted prefill?

Today the dialog accepts `invoice` (for edit). It needs a new path for &ldquo;create from import&rdquo;.

- [x] **New `prefill` prop with the extraction response shape** (`{ extracted, warnings, fileId }`); the dialog renders create-mode but seeds form state from `prefill` and shows warnings inline. Unmatched picker entries render the extracted name as the *placeholder/value-text* (no UUID).
- [ ] **Convert extraction to a fake `InvoiceResponse` and pass through the existing `invoice` prop** &mdash; reuses the prop; the dialog would falsely treat it as edit-mode unless we also pass a flag.
- [ ] **Open a separate &ldquo;Import Review&rdquo; component, then on confirm pass cleaned data into the existing dialog** &mdash; nicer separation; two components to maintain.

**Answer:**

### Q3.2 &mdash; How are unmatched entities (`id: null`) surfaced in the form?

When Claude returns `{ name: "Acme Corp", id: null }` for fromAgent, the agent picker has no UUID to select.

- [x] **The picker shows the extracted name as ghost-text alongside the empty selector, with an inline amber hint &ldquo;Couldn&apos;t find &lsquo;Acme Corp&rsquo; &mdash; pick one or create it.&rdquo;** &mdash; the admin scans down the form and notices what needs attention. No auto-create.
- [ ] **Same, plus a quick &ldquo;Create &lsquo;Acme Corp&rsquo;&rdquo; button next to the picker** that opens the AgentFormDialog pre-filled &mdash; faster workflow; meaningfully more UI per field; out of scope for v1.
- [ ] **Clear the field and show all unmatched names in a single banner at the top** &mdash; less per-field clutter; loses the &ldquo;here&apos;s the value Claude thought it saw&rdquo; nuance.

**Answer:**

### Q3.3 &mdash; Loading state during the (4&ndash;12s) extraction call

- [x] **A modal overlay with &ldquo;Extracting invoice&hellip;&rdquo; + spinner + a Cancel button** (Cancel aborts the in-flight fetch). Blocks further interaction; clear feedback for a long-ish operation.
- [ ] **A toast &ldquo;Extracting&hellip;&rdquo; and the &ldquo;Import from PDF&rdquo; button shows a spinner** &mdash; non-blocking, but the admin can wander off and lose track.
- [ ] **Open the form immediately with skeleton fields; populate when extraction returns** &mdash; feels fastest; harder to handle the failure case (form already open with empty state).

**Answer:**

### Q3.4 &mdash; How are warnings displayed once the form is open?

- [x] **An amber `Alert` banner at the top of the form** listing all warnings (&ldquo;Currency &lsquo;USD&rsquo; not matched&rdquo;, &ldquo;3 items without a matching Value&rdquo;) plus the inline per-picker hints from Q3.2. Banner is dismissable.
- [ ] **A toast list after the form opens** &mdash; less persistent; easy to miss when scrolling.
- [ ] **Inline hints only (no banner)** &mdash; cleaner; admin has to scan the whole form to find issues.

**Answer:**

### Q3.5 &mdash; BDD coverage (Claude is mocked)

- [ ] **`packages/bdd/features/invoices/import.feature`** &mdash; ~6 scenarios: happy path (PDF in &rarr; extracted fields out, fileId returned), unmatched entities surfaced in the response, line items with valueName matched / unmatched, oversize PDF rejected with 413, non-PDF mimetype rejected with 415, Claude returns invalid JSON &rarr; 422 with `rawText`. The Anthropic client is replaced by a fake that returns canned JSON keyed off a marker in the test PDFs.
- [x] **No new BDD; manual smoke only** &mdash; lowest cost; no regression protection.
- [ ] **BDD only for the gating / failure paths** (size/mime/422), skip happy-path because real Claude isn&apos;t in CI &mdash; cheaper; misses end-to-end shape verification.

**Answer:**

### Q3.6 &mdash; How is the Anthropic client mocked in tests?

- [x] **A `InvoiceImportService` constructor-injects an `AnthropicClient` interface; in tests, override the provider with a `FakeAnthropicClient` that pattern-matches the PDF&apos;s SHA-256 against a small fixture map** &mdash; idiomatic NestJS DI; deterministic; no network in CI. Production binding wires the real `@anthropic-ai/sdk` instance.
- [ ] **Mock the global `fetch` in tests** &mdash; works without DI changes; less explicit; brittle.
- [ ] **Run the real Anthropic API in CI gated by an env flag** &mdash; highest fidelity; costs $ per CI run; flaky.

**Answer:**

### Q3.7 &mdash; PR shape

- [x] **One PR**: Anthropic SDK install + service + controller route + shared schema + Zod validator + form prefill + import button + BDD &mdash; the feature has tight coupling; rollback is one revert. Matches recent precedent.
- [ ] **Two PRs**: (1) backend extraction endpoint + tests, (2) UI button + form prefill &mdash; smaller diffs; PR 2 lacks something to call until PR 1 ships.
- [ ] **Three PRs**: + Anthropic SDK setup as its own pre-PR &mdash; over-fragmented for one feature.

**Answer:**

### Q3.8 &mdash; Template sync &amp; out-of-scope

Pick all that apply (multi-select). Confirms what does *not* go in this PR.

- [x] **Mirror the new `apps/web/...` files to `packages/create-marketlum-app/template/`** (per CLAUDE.md). The Import button lives inside the existing `InvoicesPage` which is already mirrored, so the diff is small.
- [x] **No PDF preview pane next to the form** &mdash; deferred (Q1.6 picked the simple form).
- [x] **No auto-create of agents/values** (Q1.4 / Q3.2).
- [x] **No per-field confidence display** (Q2.3 option 3).
- [x] **No retry-on-bad-JSON** (Q2.5 picked first-attempt 422).
- [ ] **No per-admin daily rate limit** &mdash; we agreed not to ship it in v1; this is a deliberate non-decision rather than a future item.

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll consolidate the decisions into `specs/005-import-invoice-pdf-specification.md` and commit both files.
