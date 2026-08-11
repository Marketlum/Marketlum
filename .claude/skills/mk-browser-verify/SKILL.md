---
description: Verify UI work in a real browser — drive the running app with Puppeteer, screenshot every state, read the screenshots, and report findings. Invoked as `/mk-browser-verify <pages or flows to check>`.
argument-hint: <pages or flows to check>
---

You are running the **/mk-browser-verify** workflow for: **$ARGUMENTS**

(If `$ARGUMENTS` is empty, verify the screens touched by the current branch's diff against master; if the tree is clean, ask the user what to check.)

The goal is evidence, not vibes: a real browser renders the UI, screenshots capture what a user would see, and **you look at every screenshot** before judging the work. Builds and type checks prove code compiles — this skill proves the UI works.

---

## Workflow

### 1. Ensure the app is running the code under test

1. Check `http://localhost:3000` (web) and `http://localhost:3001` (api). If either is down — or if you changed `packages/*` since the servers started — rebuild the changed packages and (re)start `pnpm dev` in the background; wait for the ready line before proceeding. A stale server verifying old code is worse than no verification.
2. Confirm the dev database has run all migrations (`pnpm migration:run` is idempotent).

### 2. Write a scenario script (Puppeteer — already a repo dependency)

Write a throwaway `.mjs` script in the scratchpad. Boilerplate that works in this repo:

```js
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/packages/core/package.json');
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
// login: goto /login, type admin@marketlum.com / password123, submit, wait for nav
```

Scenario rules:

- **Seed what you need through the UI/API first.** An empty list proves nothing; create clearly-named throwaway records (prefix `UI Verify`) via the authenticated API so every state you check has data. Note created records in the report.
- **Exercise, don't just render**: click the buttons, open the dialogs, apply each filter, type in the search, submit the forms, scroll the scrollables (wheel events — a real regression class in this repo).
- **Screenshot every distinct state** to the scratchpad: initial load, after each interaction, error/empty states, and a **mobile pass** (viewport 390×844) of each page.
- **Collect signals beyond pixels**: subscribe to `page.on('console')` for errors/warnings and `page.on('requestfailed')` / non-2xx responses; report them all.

### 3. Look at the evidence

**Read every screenshot with the Read tool** — this is the heart of the skill; skipping it reduces everything above to theater. For each, judge:

- Layout: overflow, clipping, misalignment, crowded toolbars, broken responsive behavior on the mobile pass.
- Content: raw i18n keys leaking (`audit.kind_human` as visible text), `-` or `undefined`/`Invalid Date` where data belongs, empty states without explanation.
- Affordances: do rows look clickable when they are, do filters visibly apply, do dialogs open with real content, does pagination reflect reality.
- Consistency with the rest of the admin: badges, spacing, button placement compared to sibling pages.

### 4. Report

1. Findings ranked by severity, each with the screenshot path that shows it and (where relevant) the console/network signal.
2. What was verified and passed — explicitly, per flow, so "no finding" is a statement, not an absence.
3. Throwaway records created, so the user can clean up or ignore them.
4. Do **not** fix findings inside this skill unless it was invoked as a step of another workflow that says so — findings feed `/mk-pr` (bugs) or the calling workflow's own fix loop.

## Guardrails

- Localhost only — never point this at a deployed environment.
- Use the seeded admin (`admin@marketlum.com` / `password123`); never create or modify real credentials.
- Prefix all created records with `UI Verify` and list them in the report; never delete records you did not create.
- Screenshots stay in the scratchpad — they are evidence for this session, not repo artifacts.
