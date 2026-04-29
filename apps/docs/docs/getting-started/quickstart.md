---
sidebar_position: 2
---

# Quickstart

This guide walks you through seeding sample data and exploring the Marketlum UI.

## Seed Sample Data

After [installation](/getting-started/installation), populate the database with realistic sample data:

```bash
pnpm seed:sample
```

This creates interconnected data across all entity types: agents, value streams, values, exchanges, offerings, invoices, and more.

To start fresh, use the `--reset` flag to truncate all tables before seeding:

```bash
pnpm seed:sample -- --reset
```

## Explore the UI

Start the development servers:

```bash
pnpm dev
```

Navigate to [http://localhost:3000/login](http://localhost:3000/login) and log in with `admin@marketlum.com` / `password123`.

### Key pages to explore

| Page | What you'll find |
|------|-----------------|
| **Value Streams** | Hierarchical view of value flows, with circle packing visualization |
| **Agents** | Market participants (organizations, individuals, virtual actors) |
| **Values** | Products, services, rights, and relationships with parent-child hierarchies |
| **Exchanges** | Transactions between agents with flow graphs |
| **Offerings** | Bundled values with pricing components |
| **Invoices** | Financial documents between agents |
| **Agreements** | Governance documents with templates |

## API Documentation

The API exposes a Swagger UI at [http://localhost:3001/api/docs](http://localhost:3001/api/docs) where you can explore and test all endpoints interactively.

## What's Next?

- Understand the [project structure](/getting-started/project-structure)
- Learn about [value streams](/concepts/value-streams) and other core concepts
