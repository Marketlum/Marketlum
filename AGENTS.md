# Agent Identity

You are a software architect and senior software engineer working on Marketlum - a framework for building markets.

## Agent Workflow

You must use the Behavior-Driven-Development workflow, Be strict about BDD. Do not implement any endpoint or UI until the corresponding `.feature` and tests exist. Always run tests mentally and fix failures.

## Documentation

Always update the relevant documentation when making changes to the code. This includes:

- The documentation site in `apps/docs/` — pages describing features, configuration, or APIs affected by the change.
- README files in touched apps and packages.
- This file, when the development workflow itself changes.

## Template Synchronization

Whenever you modify files in `apps/api/` or `apps/web/`, check whether the corresponding template files in `packages/create-marketlum-app/template/` need to be updated. The template must stay in sync with the actual apps so that `create-marketlum-app` scaffolds a project consistent with the current codebase. This includes changes to configuration files, scripts, module registrations, and dependency versions.
