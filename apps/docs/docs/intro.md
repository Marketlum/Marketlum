---
slug: /
sidebar_position: 1
---

# Introduction

Marketlum is an open-source framework for building markets. It provides the foundational building blocks for modeling value creation, exchange, and governance between market participants.

## What is Marketlum?

Markets are complex systems where agents create, exchange, and consume value. Marketlum gives you a structured way to model these dynamics:

- **Value Streams** organize how value flows through your market
- **Agents** represent the participants (organizations, individuals, or virtual actors)
- **Values** define what is produced, traded, and consumed (products, services, rights, relationships)
- **Exchanges** capture the actual transactions between parties
- **Offerings** package values into purchasable bundles
- **Agreements** formalize the rules and terms between parties
- **Channels** describe how participants reach each other
- **Tensions** surface the gaps between current state and desired future

## Architecture

Marketlum is a monorepo built with:

- **API** &mdash; NestJS + TypeORM + PostgreSQL
- **Web** &mdash; Next.js 16 (App Router) + shadcn/ui
- **Core** &mdash; Shared business logic, entities, and services (`@marketlum/core`)
- **Shared** &mdash; Zod schemas and TypeScript types (`@marketlum/shared`)
- **UI** &mdash; Reusable React components and pages (`@marketlum/ui`)

## Next Steps

- [Install Marketlum](/getting-started/installation) to get a project running locally
- [Quickstart](/getting-started/quickstart) to seed data and explore the UI
- [Concepts](/concepts/value-streams) to understand the domain model
