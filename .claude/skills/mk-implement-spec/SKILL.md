---
description: Implement a specification produced by /mk-spec, faithfully and BDD-first, delivered as a Pull Request. Invoked as `/mk-implement-spec <spec number or slug>`.
argument-hint: <spec number or slug>
---

You are running the **/mk-implement-spec** workflow for: **$ARGUMENTS**

(If `$ARGUMENTS` is empty, list `specs/*-specification.md`, mark which ones already look implemented, and ask the user which to implement.)

The goal is the spec turned into working, tested, documented code on a branch, ending with a Pull Request. The specification is the contract: accepted decisions are authoritative, and deviations are exceptional, minimal, and documented.

---

## Workflow

### 1. Absorb the spec

1. Locate `specs/<nr>-<slug>-specification.md`; read it **fully**. Read the paired `-brainstorming.md` too — the `**Answer:**` lines carry qualifiers that the spec may compress.
2. Check what already exists: grep for the entities/routes/files the spec names. Specs are sometimes partially implemented or reference since-removed features — build a delta list of what actually remains to do.
3. Restate the plan to the user in a few lines (phases from the spec's Delivery Plan if present, otherwise your own ordering: shared contracts → migration → backend → UI → docs) before writing code.

### 2. Set up delivery

Follow `/mk-pr`'s preflight: clean tree, branch `spec/<nr>-<slug>` from `origin/master`. All work lands on this branch; the workflow ends with a PR like `/mk-pr`'s.

### 3. Implement — spec-first, BDD-first

Work phase by phase; keep each phase compiling and tested before the next.

1. **BDD scaffolding first.** The spec's BDD coverage table is the checklist: create every listed `.feature` file in `packages/bdd/features/<area>/` with the listed scenarios, then step definitions in `apps/api/test/` (shared app pattern, `createAuthenticatedUser()`, ref-counting rules). Scenario counts in the table are commitments — if you implement more or fewer, that's a deviation to record.
2. **Shared contracts** (`@marketlum/shared`): Zod schemas, enums, event types exactly as specified. Rebuild shared before running anything that imports it.
3. **Database**: hand-write the migration (never trust `migration:generate` output blindly); it must replay cleanly on a fresh database — reference core tables by their *current* names, and verify by replaying the full chain on a scratch database when the migration is non-trivial.
4. **Backend** (`packages/core/src/<domain>/`): module layout as the spec draws it. Wire domain events for new primary entities.
5. **UI** (`packages/ui` + thin `apps/web` routes): pages/components per the spec's UI section, EN + PL messages, permissions gating via the existing patterns.
6. **Standing rules** apply throughout: template sync for `apps/api`/`apps/web` changes, documentation updates per the spec's Documentation section (and `UPGRADE.md` for anything breaking).

### 4. Handle deviations honestly

When reality contradicts the spec (an API changed, a referenced feature was removed, a decision proves unworkable):

1. Prefer the smallest implementation that preserves the decision's *intent*.
2. Record the deviation **in the specification file itself**, inline at the affected section, in the established style: a short parenthetical explaining what changed and why.
3. Collect all deviations for the PR description. If a deviation overturns an explicitly-discussed brainstorming decision (not a detail), stop and ask the user first.

### 5. Verify

1. `pnpm lint` (0 errors), `pnpm test:unit`, builds for every touched package.
2. Targeted e2e for the spec's feature areas; every scenario from the spec's BDD table must exist and pass. Run adjacent areas the spec touches (e.g. dashboard, search) too.
3. If a migration was added: fresh-database replay check.
4. **Browser verification of every new or changed screen** — run the `/mk-browser-verify` workflow: seed data through the UI/API, exercise each page, dialog, and filter the spec describes, screenshot desktop + mobile, and read the screenshots. The spec's UI section is the checklist; a screen that was never rendered in a browser is not done. Fix what the screenshots reveal before delivering.
5. Do not run the full e2e suite locally — CI owns that.

### 6. Deliver

1. Commit in coherent phase-sized commits (repo trailer conventions), push the branch, and open the PR per `/mk-pr`'s step 5 — title `Add <feature> (spec <nr>)`, body with Summary, Test plan (scenario counts vs. the spec's table), and a **Deviations** section (or "None").
2. Report: PR URL, what was implemented per phase, test counts, deviations, and anything deliberately left for a follow-up. Suggest `/mk-fix-pr` if checks come back red and `/mk-merge` when green.

## Guardrails

- The spec is authoritative — do not "improve" accepted decisions silently; undocumented deviations are defects.
- Never edit brainstorming files; the specification file gains only inline deviation notes, never rewritten history.
- BDD scenarios are written before the code they test — implementing first and back-filling tests violates the workflow even when faster.
- All of `/mk-pr`'s guardrails apply (no pushes to master, scoped diff, no branch deletion).
- A spec too stale to implement without wholesale reinterpretation goes back to the user — suggest a `/mk-spec` refresh round instead of guessing.
