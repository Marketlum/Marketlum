---
description: Run a multi-round brainstorming session for a new feature and produce a complete specification document. Invoked as `/spec <feature description>`.
arguments: description
disable-model-invocation: true
---

You are running the **/spec** workflow for: **$description**

(If `$description` is empty, ask the user one short question to capture the feature description, then proceed.)

The goal is to lead the user through a structured Q&A brainstorming session and then write a complete, implementation-ready specification document. Do **not** start implementation &mdash; this skill ends at &ldquo;spec written and committed.&rdquo;

---

## Workflow

### 1. Bootstrap (do this once, immediately on invocation)

1. **Pick a spec number.** Look at `specs/`. If empty, use `001`. Otherwise increment the highest existing 3-digit prefix.
2. **Derive a slug.** From the description, produce a short kebab-case slug (e.g. &ldquo;tracking recurring revenue and expenses for value streams&rdquo; → `recurring-flows`). 2&ndash;4 words. Don&apos;t over-think; if ambiguous, pick something and proceed.
3. **Briefly investigate the codebase** so questions are grounded in real entities, paths, and patterns. One or two greps / file reads, not a deep dive.
4. **Create `specs/{nr}-{slug}-brainstorming.md`** with:
   - A title and one-line `> **Goal:**` block
   - A `> **Process:**` block restating the append-only rule
   - A `## Context` section summarising what already exists in the relevant area
   - An ASCII diagram if it helps frame the problem
   - `---`
   - The first round of questions

### 2. Round structure

For every round:

- One round per turn. Do **not** post multiple rounds at once.
- 4&ndash;7 questions per round.
- Each question has 3&ndash;5 mutually-exclusive options, each formatted as:
  ```
  - [x] **Option label** &mdash; one-line rationale (recommended option uses [x])
  - [ ] **Alternative** &mdash; one-line rationale, including the trade-off
  ```
- Exactly one option per question is preselected with `[x]` &mdash; the one you recommend.
- Every question ends with `**Answer:**` on its own line for the user to append below.
- Use ASCII diagrams, mini-tables, or example data shapes inside questions when they clarify a trade-off.
- Add a one-sentence intro to each round explaining its theme.

### 3. Typical round sequence (adapt to feature)

- **Round 1 &mdash; Foundations**: Is this a new entity or an extension? Scope? Cardinality? Relationship to existing models?
- **Round 2 &mdash; Shape**: Fields, enums, lifecycle/state machine, validation, units/amounts.
- **Round 3 &mdash; UI / UX**: Where in the admin? List/detail/forms? Visualisations, rollups, projections.
- **Round 4 &mdash; Integration, security, delivery**: Links to other entities, permissions (default to the existing `AdminGuard` pattern unless the user says otherwise), seed data, export, technology choices, phasing.

Some features need fewer rounds, some more. Stop when no question is worth the user&apos;s time.

### 4. Between rounds

When the user signals the round is complete (typically &ldquo;Done&rdquo;):

1. **Read the entire brainstorming file** to capture any user edits.
2. **Parse changes** for each question:
   - Moved `[x]` → that&apos;s the user&apos;s chosen option (overrides your preselected recommendation).
   - Text after `**Answer:**` → the user&apos;s elaboration / qualifier (treat as authoritative additional context).
   - No changes → the preselected recommendation is accepted.
3. **Summarise the accepted answers** for the round in the chat (one line per question) so the trail is explicit. If you read the user&apos;s silence as agreement, say so &mdash; let them push back.
4. **Append the next round** to the file. **Never modify existing content** in the brainstorming file &mdash; only append.

### 5. Writing the specification

When all rounds are complete:

1. **Write `specs/{nr}-{slug}-specification.md`** consolidating every accepted decision into an implementation-ready document. Suggested sections (adapt to feature):
   - Overview + diagram
   - Domain model (full entity table, state machine diagram, Zod validation rules)
   - API surface (every endpoint, with request/response shapes for non-trivial ones)
   - Domain helpers (pure functions in `@marketlum/shared`)
   - UI / UX (pages, components, mockups in ASCII or markdown tables)
   - Database (SQL DDL or migration outline + referential integrity rules)
   - Permissions (the existing `AdminGuard` is the default; only deviate if the user chose otherwise)
   - Backend module layout (files in `packages/core/src/<domain>/`)
   - Shared package additions
   - UI package additions
   - Web app wiring (call out the template-sync rule from `CLAUDE.md` for any `apps/web/src/app/admin/...` page that must be mirrored under `packages/create-marketlum-app/template/`)
   - Seed data (additions to `seed-sample.command.ts`)
   - BDD test coverage (feature files + step definitions, scenario counts &mdash; the project enforces strict BDD)
   - Out of scope (with references back to the brainstorming questions that defined the boundary)
   - Delivery plan (order of work within the PR)
2. The spec must be unambiguous enough that a developer can start implementing without re-running the brainstorm.
3. Cross-reference the brainstorming file as the decision trail.

### 6. Commit and stop

1. `git add specs/` and create one commit covering both files. Use a message like:
   ```
   Add brainstorming and specification for <feature>

   <one-paragraph summary of what was decided>
   ```
   Follow the project&apos;s commit conventions (see recent `git log` &mdash; sentence-case, no Conventional Commits prefixes, end with the `Co-Authored-By` line per the harness defaults).
2. Tell the user where the spec lives and that the brainstorm is committed.
3. **Do NOT start implementation.** The user will trigger that separately (or in a follow-up PR).

---

## Hard rules

- **Append-only** in the brainstorming file. Never edit or delete existing questions or answers.
- **One round per turn.** Do not flood the user.
- **Always preselect** `[x]` on your recommended option. Make recommending easy: silence = acceptance.
- **Ground every question** in the actual codebase. If a question hinges on a model that doesn&apos;t exist, investigate before asking.
- **Default permissions** to the existing `AdminGuard` (`packages/core/src/auth/guards/admin.guard.ts`) applied at the controller level, mirroring `OfferingsController`, `LocalesController`, etc. Only deviate if the user explicitly asks for something else.
- **Default validation** to Zod schemas in `@marketlum/shared` (single source of truth, already the project pattern).
- **Default tests** to full BDD coverage (`packages/bdd/features/` + `apps/api/test/`) per the project&apos;s strict BDD rule.
- **Template sync**: if the spec touches `apps/api/` or `apps/web/`, the spec must call out the mirror to `packages/create-marketlum-app/template/`.
- **One commit at the end.** Do not commit the brainstorming file in pieces between rounds.
