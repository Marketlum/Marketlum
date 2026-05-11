---
sidebar_position: 8
---

# Submitting a Pull Request

You&apos;ve made your change, the BDD suite passes, and you&apos;re ready to send it. Here&apos;s what happens next.

## Before you open the PR

Run through this checklist:

- [ ] `.feature` files exist for any new or changed behavior.
- [ ] `pnpm test:e2e` passes locally.
- [ ] `pnpm build` succeeds across all packages.
- [ ] If you touched `apps/api/` or `apps/web/`, mirrored changes are in `packages/create-marketlum-app/template/`.
- [ ] If you changed `@marketlum/shared`, you rebuilt it before testing API consumers.
- [ ] A migration exists for every schema change, and it reverts cleanly.
- [ ] No `console.log` debug statements left in the diff.

## Branching

Branch off `master`. Use a short, descriptive name:

```
feat/widget-bulk-import
fix/exchange-decimal-rounding
docs/customization-guide
chore/upgrade-typeorm
```

## Commit style

Look at recent history with `git log --oneline` and match the tone. Short, sentence-case, imperative-ish messages:

```
Add widgets module with CRUD endpoints
Fix decimal rounding on exchange flow totals
Update README installation steps
```

Avoid:
- Conventional Commits prefixes (`feat:`, `fix:`) &mdash; the existing history doesn&apos;t use them.
- All-caps subject lines.
- Subject lines longer than ~72 characters &mdash; put detail in the body.

Multi-paragraph bodies are welcome when the *why* needs context.

## Opening the PR

PR title mirrors the commit style (short, sentence-case). PR description should answer:

- **What changes** &mdash; one or two bullet points.
- **Why** &mdash; the problem this solves, or the issue this closes.
- **How to verify** &mdash; commands to run, scenarios to spot-check.

If the PR touches the database schema, call out the migration explicitly. If it changes a public Zod schema or service signature, call out the breaking change.

## What reviewers look for

In rough order of importance:

1. **BDD coverage.** Does every new behavior have a scenario? Are the scenarios readable as documentation?
2. **Boundary respect.** Did the change land in the right package? Did `apps/*` stay thin? Did `@marketlum/shared` stay pure?
3. **Template sync.** If `apps/api/` or `apps/web/` changed, is `packages/create-marketlum-app/template/` in lockstep?
4. **Migration shape.** Is the migration minimal and reversible? Any drift artifacts removed?
5. **Public API impact.** Did `packages/core/src/index.ts` or `packages/shared/src/index.ts` exports change? Is the change intentional?
6. **Conventions.** TypeORM gotchas avoided (decimals, cascade, search vectors)? See [Coding Conventions](/contributing/coding-conventions).
7. **Code style.** Comments only where the *why* is non-obvious. No unnecessary abstractions.

## Iterating on review feedback

Push new commits rather than amending or force-pushing &mdash; reviewers want to see what changed between rounds. After approval, the maintainer may squash on merge.

## After your PR merges

- Pull `master` locally.
- If you added a migration, run `pnpm migration:run` to update your dev DB.
- If you added a public export, the next release of `@marketlum/core` (or `@marketlum/shared`, `@marketlum/ui`) will include it.

Thanks for contributing.
