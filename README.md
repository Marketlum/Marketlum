# Marketlum

A framework for building markets.

## Tech Stack

- **API** — NestJS, TypeORM, PostgreSQL
- **Web** — Next.js 14 (App Router), shadcn/ui, TanStack Table
- **Shared** — Zod schemas used by both API and Web
- **BDD** — Gherkin feature files with jest-cucumber

## Project Structure

```
apps/
  api/          NestJS REST API (port 3001)
  web/          Next.js admin UI (port 3000)
packages/
  shared/       Zod schemas and shared types
  bdd/          Gherkin feature files
```

## Prerequisites

- Node.js >= 20
- pnpm 10.6+
- Docker (for PostgreSQL)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm db:up

# Run database migrations
pnpm migration:run

# Seed the admin user
pnpm seed

# Start API and Web in development mode
pnpm dev
```

The API runs at `http://localhost:3001` and the web UI at `http://localhost:3000`.

API docs (Swagger) are available at `http://localhost:3001/api/docs`.

## Scripts

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `pnpm dev`             | Start API and Web in watch mode    |
| `pnpm build`           | Build all packages                 |
| `pnpm test:e2e`        | Run BDD tests                      |
| `pnpm seed`            | Seed admin user                    |
| `pnpm migration:run`   | Run database migrations            |
| `pnpm migration:revert`| Revert last migration              |
| `pnpm db:up`           | Start PostgreSQL via Docker        |
| `pnpm db:down`         | Stop PostgreSQL                    |

## License

Released under the [MIT License](./LICENSE).
