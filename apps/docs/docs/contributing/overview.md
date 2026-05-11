---
sidebar_position: 1
---

# Contributing Overview

Thanks for your interest in contributing to Marketlum. This guide is for people working *on* the framework &mdash; cloning the monorepo and editing `@marketlum/core`, `@marketlum/ui`, `@marketlum/shared`, or the scaffolded apps.

If you&apos;re building a market *with* Marketlum, you probably want the [Customization Guide](/customization/overview) instead.

## Who this is for

You&apos;re in the right place if you want to:

- Fix a bug in the API, web UI, or shared schemas
- Add a new feature to the framework that benefits all users
- Improve documentation
- Extend the admin UI with new shared components
- Add a step definition for a new BDD scenario

## How contributions are reviewed

Marketlum follows a strict **Behavior-Driven Development** workflow. Every endpoint and UI behavior has a `.feature` file in `packages/bdd/features/` and corresponding step definitions in `apps/api/test/`. Pull requests that add or change behavior without updating the BDD specs will be asked to add them before review.

The framework also maintains a hard separation between user-owned code (`apps/api`, `apps/web` &mdash; the scaffolded shells) and framework-owned code (`packages/core`, `packages/ui`, `packages/shared`). Changes to the framework must be mirrored in the scaffolding template under `packages/create-marketlum-app/template/`. See [Coding Conventions](/contributing/coding-conventions) for the template-sync rule.

## What&apos;s in this guide

| Page | When to read |
|------|--------------|
| [Dev Setup](/contributing/dev-setup) | First time setting up the repo |
| [Repository Layout](/contributing/repo-layout) | Finding where to make a change |
| [BDD Workflow](/contributing/bdd-workflow) | Adding or modifying a feature |
| [Testing](/contributing/testing) | Running the suite, debugging failures |
| [Coding Conventions](/contributing/coding-conventions) | Before opening your first PR |
| [Database Migrations](/contributing/migrations) | Changing the database schema |
| [Submitting a Pull Request](/contributing/submitting-a-pr) | Ready to send your work |

## Getting help

- **Bug or feature request:** [open an issue](https://github.com/Marketlum/Marketlum/issues)
- **Questions about how something works:** start with the [Concepts](/concepts/value-streams) section, then ask in an issue
- **Security report:** please disclose privately, not in a public issue
