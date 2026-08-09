---
description: Safely merge a Pull Request — verify checks, merge, and confirm master stays green. Invoked as `/mk-merge <PR number, branch, or empty for current branch's PR>`.
argument-hint: <PR number or branch>
---

You are running the **/mk-merge** workflow for: **$ARGUMENTS**

(If `$ARGUMENTS` is empty, resolve the PR from the current branch via `gh pr view`; if there is none, list open PRs with `gh pr list` and ask the user which one to merge.)

The goal is a merged PR with clean branches and a green master. Merging is hard to reverse — verify before acting, never force through a failing state.

---

## Workflow

### 1. Verify the PR is safe to merge

Run `gh pr view <n> --json state,title,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup` and check, in order:

1. **State** is `OPEN` (a merged/closed PR ends the workflow with a report).
2. **Checks**: every non-neutral check in `statusCheckRollup` is successful.
   - If checks are **pending**, tell the user and watch them (Monitor with `gh pr checks <n>`), then continue when they finish.
   - If any check **failed**, STOP. Report the failing check with its log excerpt (`gh run view --log-failed`). Do not merge — offer to investigate the failure instead. Only merge over a red check if the user explicitly says so after seeing which check failed and why.
3. **Mergeable**: if `CONFLICTING`, stop and offer to rebase the branch onto the base first (`git fetch`, rebase, `--force-with-lease` push, then re-verify checks).
4. **Reviews**: if `reviewDecision` is `CHANGES_REQUESTED`, stop and surface the review comments. `REVIEW_REQUIRED`/empty is fine in this repo (no branch protection requiring approvals) — just note it.
5. **Base**: if the base branch is not `master`, point it out and confirm with the user before merging.

### 2. Merge

1. Use a **merge commit** (`gh pr merge <n> --merge`) — this repo's history keeps PR branches' individual commits (e.g. a feature commit and a CI fix commit both matter later; `git log` archaeology depends on them). Use `--squash` only if the user asks or the branch is a pile of fixup commits with no standalone value.
2. Do not pass `--admin` or any bypass flag.

### 3. Sync local master

`git checkout master && git pull origin master`. Do **not** delete any branches — neither the remote PR branch nor the local one. Branches are kept after merge in this repo; the user prunes them when they choose to.

### 4. Confirm master is green

1. The merge push triggers CI on master. Arm a Monitor on the new run (`gh run list --branch master`) covering **all** terminal states — success and failure alike.
2. When it completes: report success, or if master went red, treat it as the top priority — investigate immediately and propose a fix or revert.

### 5. Report

Tell the user: PR number and title, merge commit SHA, and master CI status (or that it's being monitored). Mention anything skipped or unusual (red check overridden, non-master base, squash used).

## Guardrails

- Never merge with failing checks unless the user explicitly overrides after seeing the failure.
- Never use `--admin` bypasses.
- Never delete any branch, local or remote — no `--delete-branch`, no `git push origin --delete`, no `git branch -d/-D`.
- If the merge fails server-side (409, protection rules), report the exact error rather than retrying with escalating flags.
