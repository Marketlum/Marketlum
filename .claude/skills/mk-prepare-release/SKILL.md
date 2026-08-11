---
description: Prepare a Marketlum release — bump the published packages, keep plugin compatibility ranges in step, update UPGRADE.md, verify, and publish it as a PR, a tag, and a GitHub release with written notes. Invoked as `/mk-prepare-release <version>`.
argument-hint: <version, e.g. 0.6.0>
---

You are running the **/mk-prepare-release** workflow for version: **$ARGUMENTS**

(If `$ARGUMENTS` is empty, read the latest `v*` tag, summarize what has merged since, propose the next version with a one-line rationale — patch for fixes only, minor for features or removals while pre-1.0 — and ask the user to confirm before touching anything.)

A release is a claim that this commit is good, plus the notes that tell people what changed. Everything below exists to make both true.

---

## Workflow

### 1. Preflight — never release onto uncertainty

1. Clean working tree; on `master`, synced with `origin/master` (`git fetch && git status`).
2. **Master CI must be green on the commit you are releasing.** Check the latest master run; if it is red or still running, stop and report — a tag on a broken commit is what people bisect to later.
3. Confirm the version is new: `git tag --list "v<version>"` must be empty, and it must be greater than the current package versions.

### 2. Gather the material for the release notes

Two commands cover everything that landed, without double-counting:

```bash
# Merged PRs — subject is the merge, body is the PR title
git log v<previous>..HEAD --merges --format='%s%n  ↳ %b'

# Work committed straight to master (no PR)
git log v<previous>..HEAD --no-merges --first-parent --oneline
```

(Plain `--no-merges` without `--first-parent` also lists every commit *inside* merged branches — far too granular for notes.)

Read the results and group them by what they mean to a user, not by commit order. Skim `UPGRADE.md` for anything breaking. If nothing has landed since the last tag, say so and stop.

### 3. Bump the published packages — and only those

Set `"version": "<version>"` in exactly these four:

- `packages/core/package.json` (`@marketlum/core`)
- `packages/shared/package.json` (`@marketlum/shared`)
- `packages/ui/package.json` (`@marketlum/ui`)
- `packages/create-marketlum-app/package.json`

**Leave alone:** `apps/*` (private, unpublished), `packages/bdd` (private test assets), and `packages/plugin-*` — the bundled plugins version independently (nbp and rdhy are deliberately not in lockstep with core). Bump a plugin only if the user asks or that plugin genuinely changed, and say so explicitly.

### 4. Keep plugin compatibility ranges in step — the step that breaks the build if skipped

`MARKETLUM_CORE_VERSION` is read from `packages/core/package.json` at runtime, and every plugin manifest declares a `marketlumCoreVersion` range that `validatePlugins()` checks **at boot**. Under 0.x caret semantics `^0.5.0` does **not** satisfy `0.6.0` — so bumping core without bumping the ranges makes `MarketlumCoreModule.forRoot()` throw on startup, taking the API, the web app, and the entire e2e suite down with it.

For every bundled plugin (`packages/plugin-*/src/index.ts`), update `marketlumCoreVersion` to `^<version>` in the same commit. Grep afterwards to prove none were missed:

```bash
grep -rn 'marketlumCoreVersion' packages/plugin-*/src/index.ts
```

### 5. Update `UPGRADE.md`

If it has an `## Unreleased — …` section, retitle it for this release (keep the existing per-change wording; newest section stays on top). If there is no Unreleased section and nothing breaking merged, leave the file alone — do not invent entries.

### 6. Verify — prove the release boots, not just compiles

1. `pnpm build` (all packages), `pnpm lint` (0 errors), `pnpm test:unit`. The core-version unit test pins `MARKETLUM_CORE_VERSION` to package.json, so a mismatch fails here.
2. **Boot proof**: run an e2e suite that starts the app with plugins registered (e.g. `pnpm --filter @marketlum/api test:e2e --testPathPattern='plugins|rdhy'`). If the compatibility ranges in step 4 are wrong, this is where it surfaces — a green unit run will not catch it.
3. Do not run the full e2e suite locally; CI owns that.

### 7. Ship the version bump as a PR

Commit on a `release/v<version>` branch with the message `Prepare release v<version>` (repo trailer conventions apply), push, and open a PR titled `Prepare release v<version>` whose body is the draft release notes from step 8 — so the notes get reviewed alongside the bump.

Report the PR URL and tell the user the release **is not done until the PR merges and the tag and GitHub release are published**.

### 8. Write the release notes

Draft them from step 2's material. Write for someone deciding whether to upgrade — group by meaning, lead with what changed for them, and drop pure-noise commits (formatting, internal skill/tooling edits) unless they affect users.

```markdown
## Highlights

Two to four sentences: what this release is about, in plain language.

## Features
- Human and Agent user types — AI agents authenticate with admin-provisioned API keys and can act as market actors (#24)

## Fixes
- Mouse-wheel scrolling in dialog-hosted pickers (#25)

## Documentation
- Documentation reframed around actors as the center of the domain (#28)

## Infrastructure
- Node 24, whole-repo lint coverage, unit tests in CI

## Upgrading

Anything an existing project must do — mirror `UPGRADE.md`. Omit the section entirely if there is nothing.

**Full changelog**: https://github.com/Marketlum/Marketlum/compare/v<previous>...v<version>
```

Reference PR numbers as `(#N)` — GitHub links them automatically. Omit any section with no entries; never pad.

### 9. After the PR merges — tag and publish the release

Publishing a GitHub release is outward-facing and notifies watchers, so **show the user the final notes and get an explicit go-ahead first**. Then, on the merge commit:

```bash
git checkout master && git pull origin master
git tag v<version> && git push origin v<version>          # lightweight tag, repo convention
gh release create v<version> --verify-tag \
  --title "v<version>" --notes-file <notes.md>
```

Write the notes to a scratchpad file and pass `--notes-file` — heredocs mangle markdown. Use `--draft` instead of publishing if the user wants to edit on GitHub first.

Finish by reporting the release URL, and confirm master CI is green on the merge commit (`/mk-merge` will normally have done this).

## Guardrails

- Never tag a commit that is not on `master`, and never tag before CI is green on it.
- Never push to `master` directly — the version bump goes through a PR like any other change.
- Never move or delete an existing tag or release; if a released version is wrong, cut the next version instead.
- Never bump `apps/*` or `packages/bdd`, and never bump plugins silently.
- Never publish the GitHub release without showing the notes and getting a go-ahead — it is public and notifies watchers.
- Release notes describe what actually shipped. Do not credit work that is not in the range, and do not soften removals or breaking changes.
- If publishing to npm is requested, stop and confirm — that is a separate irreversible action this skill does not perform on its own.
