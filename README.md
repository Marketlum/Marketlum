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

## 🤖 MCP Server

Every Marketlum market exposes an [MCP](https://modelcontextprotocol.io) server at `POST /mcp` (Streamable HTTP, stateless), so AI agents can query the market through a curated, permission-aware tool surface.

**Authentication.** MCP accepts Marketlum API keys only, sent as `Authorization: Bearer <key>`. Create a role with the `*:read` grants you want to expose (Roles → New role), assign it to a user, and create an API key for that user (Settings → API keys). The key's effective permissions decide which tools are listed and callable — a key whose user only holds `invoices:read` and `search:read` sees exactly `search_market`, `search_invoices` and `get_invoice`.

**Tools (v1, read-only).** `search_market`, `search_agents`, `get_agent`, `get_agent_financials`, `search_invoices`, `get_invoice`, `search_orders`, `get_order`, `list_value_streams`, `get_dashboard_summary`, `get_exchange_rate`. List tools accept `page`/`limit` (default 20, max 100) and return the same `{ data, meta }` envelopes as the REST API. Domain failures come back as tool errors with a machine-readable `{ "code": "FORBIDDEN" | "NOT_FOUND" | "INVALID_INPUT" | "INTERNAL", "message": "…" }` payload.

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
