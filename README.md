<p align="center">
  <img src="apps/web/public/logo.png" alt="Marketlum" width="160" height="160" />
</p>

# Marketlum

🚀 A revolutionary framework for building markets.

## 🧰 Tech Stack

- 🛠️ **Backend API** — NestJS, TypeORM, PostgreSQL
- 🎨 **Frontend Web** — Next.js 16 (App Router), shadcn/ui, TanStack Table

## 📁 Project Structure

```
apps/
  api/                        NestJS REST API (port 3001)
  web/                        Next.js admin UI (port 3000)
  docs/                       Docusaurus documentation site
packages/
  core/                       Framework backend (modules, entities, migrations)
  ui/                         Framework admin UI (pages, components)
  shared/                     Zod schemas and shared types
  bdd/                        Gherkin feature files
  plugin-nbp/                 NBP exchange-rates plugin
  plugin-rdhy/                RDHY marketplace plugin
  create-marketlum-app/       Scaffolding for new apps
```

## ✅ Prerequisites

- 🟢 Node.js >= 24
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
| `pnpm lint`            | Lint all packages                  |
| `pnpm test:unit`       | Run unit tests                     |
| `pnpm test:e2e`        | Run BDD tests                      |
| `pnpm seed:admin`      | Seed admin user                    |
| `pnpm seed:sample`     | Seed sample market data            |
| `pnpm migration:run`   | Run database migrations            |
| `pnpm migration:revert`| Revert last migration              |
| `pnpm audit:prune`     | Prune old audit-trail entries      |
| `pnpm db:up`           | Start PostgreSQL via Docker        |
| `pnpm db:down`         | Stop PostgreSQL                    |
| `pnpm docs:dev`        | Run the documentation site         |

## 🤖 MCP Server

Every Marketlum market exposes an [MCP](https://modelcontextprotocol.io) server at `POST /mcp` (Streamable HTTP, stateless), so AI agents can query the market through a curated, permission-aware tool surface.

**Authentication.** MCP accepts Marketlum API keys only, sent as `Authorization: Bearer <key>`. Create a role with the `<resource>:read` / `<resource>:write` grants you want to expose (Roles → New role), assign it to a user, and create an API key for that user (Settings → API keys). The key's effective permissions decide which tools are listed and callable — a key whose user only holds `invoices:read` and `search:read` sees exactly `search_market`, `search_invoices` and `get_invoice`.

**Read tools.** `search_market`, `search_actors`, `get_actor`, `get_actor_financials`, `search_invoices`, `get_invoice`, `search_orders`, `get_order`, `list_value_streams`, `get_dashboard_summary`, `get_exchange_rate`, plus `search_x`/`get_x` pairs for values, tensions, agreements, offerings and taxonomies. List tools accept `page`/`limit` (default 20, max 100) and return the same `{ data, meta }` envelopes as the REST API.

**Write tools.** `create_x`/`update_x` for values, tensions, agreements, offerings and taxonomies, gated by the corresponding `<resource>:write` grant. Writes validate with the same Zod schemas as the REST API and land in the audit trail like any other mutation. Deliberately excluded: deletion and lifecycle-state transitions (MCP-created offerings always start as drafts; tensions start alive) — those remain human actions.

Domain failures come back as tool errors with a machine-readable `{ "code": "FORBIDDEN" | "NOT_FOUND" | "INVALID_INPUT" | "INTERNAL", "message": "…" }` payload.

**Connect from the Vercel AI SDK:**

```ts
import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const mcpClient = await experimental_createMCPClient({
  transport: new StreamableHTTPClientTransport(new URL('http://localhost:3001/mcp'), {
    requestInit: { headers: { Authorization: `Bearer ${process.env.MARKETLUM_API_KEY}` } },
  }),
});
const tools = await mcpClient.tools(); // pass to generateText / streamText
```

**Connect from Claude Code:**

```sh
claude mcp add --transport http marketlum http://localhost:3001/mcp \
  --header "Authorization: Bearer $MARKETLUM_API_KEY"
```

## 📄 License

Released under the [MIT License](./LICENSE).
