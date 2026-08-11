---
description: Implement a task on a dedicated branch and open a Pull Request for it. Invoked as `/mk-pr <task description>`.
argument-hint: <task description>
---

You are running the **/mk-pr** workflow for: **$ARGUMENTS**

(If `$ARGUMENTS` is empty, take the task from the `<command-args>` of the invocation; if that is empty too, ask the user one short question to capture the task, then proceed.)

The goal is to deliver the task as a reviewable Pull Request against `master`. The skill ends at "PR opened, link reported" — do not merge.

---

## Workflow

### 1. Preflight

1. Ensure the working tree is clean (`git status`). If there are uncommitted changes, stop and ask the user whether to stash them or abort — never mix unrelated changes into the PR.
2. `git fetch origin master` and start the branch from `origin/master`.
3. **Derive a branch name.** From the task, produce `task/<kebab-slug>` (2–4 words, e.g. `task/actor-csv-export`). Create it: `git checkout -b task/<slug> origin/master`.

### 2. Implement — following the project workflow (AGENTS.md)

1. **BDD first** for anything with an endpoint or UI surface: write or extend the `.feature` file in `packages/bdd/features/` and the step definitions in `apps/api/test/` before implementing. Internal pure logic gets colocated `*.spec.ts` unit tests instead.
2. Implement the change. Respect the standing rules:
   - **Template sync:** if you touch `apps/api/` or `apps/web/`, mirror relevant changes in `packages/create-marketlum-app/template/`.
   - **Documentation:** update affected pages in `apps/docs/`, READMEs, and AGENTS.md when the workflow itself changes.
   - **Migrations:** new migrations must replay cleanly on a fresh database in timestamp order — plugin migrations (timestamps 100+) run after ALL core migrations, so reference core tables by their current (post-rename) names.
3. Keep the diff scoped to the task. If you discover unrelated problems, note them for the final report instead of fixing them in this PR.

### 3. Verify

Run, in order, and fix failures before proceeding:

1. `pnpm lint` — must report 0 errors.
2. `pnpm test:unit` — all unit tests green.
3. Builds for whatever was touched: `pnpm --filter @marketlum/shared build`, `core`, `ui`, `pnpm --filter @marketlum/web build`, `pnpm --filter @marketlum/api build` as applicable.
4. Targeted e2e for the affected feature area if the change has an API surface: `pnpm test:e2e -- --testPathPattern=<area>`. Do not run the full e2e suite locally — CI does that.
5. **Browser verification** — if the change touches `packages/ui` or `apps/web`, run the `/mk-browser-verify` workflow against the affected pages before opening the PR: drive the real app, screenshot each state (desktop + mobile), read the screenshots, and fix what they reveal. Summarize what was verified (and any deliberately unfixed findings) in the PR's test plan.

### 4. Commit and push

1. Commit with a message that explains **why**, not just what. Follow the repository convention for trailers (Co-Authored-By / Claude-Session, as configured for this harness).
2. Push the branch: `git push -u origin task/<slug>`.

### 5. Open the Pull Request

1. Open it with `gh pr create --base master`, with:
   - **Title:** imperative, ≤ 70 chars, matching the commit style of this repo.
   - **Body:** a `## Summary` (what and why, 2–4 bullets), a `## Test plan` (what was run/added — feature scenarios, unit tests, builds), and the standard footer:

     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```
2. Report back to the user: the PR URL, a one-paragraph summary of the change, test counts, and any unrelated issues discovered along the way.
3. If CI is expected to be the decisive validation (migrations, multer/upload paths, anything DB-shaped), say so explicitly and offer to monitor the run.

## Guardrails

- Never commit or push to `master` from this skill — everything goes through the branch and PR.
- Never `git push --force` on a shared branch; use `--force-with-lease` only on the PR's own branch after a rebase.
- If the task turns out to need a spec-level discussion (new entity, cross-cutting rename, breaking API change), stop and suggest running `/mk-spec` first instead of pushing ahead.
