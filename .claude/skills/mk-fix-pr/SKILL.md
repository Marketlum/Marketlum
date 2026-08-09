---
description: Bring a Pull Request to a ready-to-merge state — rebase onto master, resolve conflicts, fix failing checks, and re-verify. Invoked as `/mk-fix-pr <PR number, branch, or empty for current branch's PR>`.
argument-hint: <PR number or branch>
---

You are running the **/mk-fix-pr** workflow for: **$ARGUMENTS**

(If `$ARGUMENTS` is empty, resolve the PR from the current branch via `gh pr view`; if there is none, list open PRs with `gh pr list` and ask the user which one to fix.)

The goal is a PR that `/mk-merge` would accept without hesitation: rebased on current master, conflict-free, all checks green, review feedback addressed or surfaced. This skill updates the PR — it never merges it.

---

## Workflow

### 1. Assess

1. Ensure the working tree is clean; if not, stop and ask (stash vs. abort) — never mix local edits into the PR.
2. `gh pr view <n> --json state,title,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,reviews,comments` and build a punch list of everything blocking merge:
   - behind or conflicting with the base branch,
   - failing or pending checks,
   - `CHANGES_REQUESTED` reviews or unresolved review comments.
3. Report the punch list to the user in one short summary before acting.

### 2. Rebase onto master

1. `git fetch origin`, `git checkout <headRef>`, `git rebase origin/master`.
2. On conflicts: resolve them when the resolution is mechanical or clearly implied by both sides' intent (imports, adjacent additions, lockfile — regenerate via `pnpm install` rather than hand-merging `pnpm-lock.yaml`). If a conflict requires a real product/design decision, abort the rebase (`git rebase --abort`), report the conflicting files and the decision needed, and stop.
3. After a successful rebase with conflicts resolved, re-run the affected builds/tests locally before pushing (at minimum `pnpm lint` and `pnpm test:unit`; targeted e2e if API code was involved).
4. Push with `git push --force-with-lease` — never plain `--force`. If the lease fails, someone else updated the branch: re-fetch, re-assess, do not override.

### 3. Fix failing checks

1. For each failing check, pull the actual failure (`gh run view <id> --log-failed`) and diagnose the root cause — do not rerun-and-hope. Distinguish:
   - **Caused by the PR** — fix it on the branch (BDD rules apply: adjust feature files/tests together with the code).
   - **Infrastructure/flake** (cache issues, downloads, timeouts) — fix the infrastructure on the branch if small and safe (as with CI-level installs), otherwise report it as blocking and let the user decide where the fix should land.
   - **Pre-existing on master** — verify by checking master's latest run; if master is equally red, say so and don't chase it here.
2. Commit fixes as separate, well-messaged commits on the PR branch (repo trailer conventions apply).

### 4. Address review feedback

1. If reviews requested changes, go through each comment: implement the requested change when it's unambiguous, or collect questions for the user when it isn't.
2. Reply is the user's job — don't post review responses on their behalf; summarize instead what was addressed and what needs their answer.

### 5. Re-verify and hand off

1. After pushing, watch the fresh checks (Monitor on `gh pr checks <n>`, covering all terminal states).
2. Report: what was rebased (how many commits, conflicts resolved and where), what was fixed, current check status, and anything still blocking (unanswered review comments, decisions needed).
3. Suggest `/mk-merge <n>` when everything is green.

## Guardrails

- Never merge the PR — that's `/mk-merge`'s job.
- Never push to `master` or any branch other than the PR's head branch.
- `--force-with-lease` only, and only after a rebase this workflow performed.
- Never delete any branch.
- Never resolve a conflict by discarding one side wholesale without understanding both; when in doubt, abort and ask.
- Don't rewrite commit messages or squash the branch's history unless the user asks.
