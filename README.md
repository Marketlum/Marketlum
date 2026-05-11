<p align="center">
  <img src="apps/web/public/logo.png" alt="Marketlum" width="160" height="160" />
</p>

# Marketlum

🚀 A revolutionary framework for building markets.

## 🧰 Tech Stack

- 🛠️ **Backend API** — NestJS, TypeORM, PostgreSQL
- 🎨 **Frontend Web** — Next.js 14 (App Router), shadcn/ui, TanStack Table

## 📁 Project Structure

```
apps/
  api/                        NestJS REST API (port 3001)
  web/                        Next.js admin UI (port 3000)
packages/
  shared/                     Zod schemas and shared types
  bdd/                        Gherkin feature files
  create-marketlum-app/       Scaffolding new app 
```

## ✅ Prerequisites

- 🟢 Node.js >= 20
- 📦 pnpm 10.6+
- 🐳 Docker (for PostgreSQL)

## 🏁 Getting Started (to contribute)

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm db:up

# Run database migrations
pnpm migration:run

# Seed the admin user
pnpm seed:admin

# Start API and Web in development mode
pnpm dev
```

The API runs at `http://localhost:3001` and the web UI at `http://localhost:3000`.

API docs (Swagger) are available at `http://localhost:3001/api/docs`.

## ⚙️ Scripts

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `pnpm dev`             | Start API and Web in watch mode    |
| `pnpm build`           | Build all packages                 |
| `pnpm test:e2e`        | Run BDD tests                      |
| `pnpm seed:admin`      | Seed admin user                    |
| `pnpm migration:run`   | Run database migrations            |
| `pnpm migration:revert`| Revert last migration              |
| `pnpm db:up`           | Start PostgreSQL via Docker        |
| `pnpm db:down`         | Stop PostgreSQL                    |

## 📄 License

Released under the [MIT License](./LICENSE).
