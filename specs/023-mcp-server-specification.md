# 023 — MCP Server (`/mcp`) — Specification

> Decision trail: [`023-mcp-server-brainstorming.md`](./023-mcp-server-brainstorming.md) (Q1–Q24).

## Overview

Marketlum core gains an MCP (Model Context Protocol) server: a curated, read-only, permission-aware tool surface that any MCP-capable client (Vercel AI SDK agents, Claude Code, Claude Desktop, Cursor, …) can connect to over Streamable HTTP. It ships as a **core module** — every Marketlum market has it, always on (Q1) — mounted at `POST /mcp` on the existing API (port 3001) (Q2), authenticated exclusively with Marketlum API keys (spec 019) (Q4), and enforcing HRBAC per tool (specs 020/021) (Q5).

v1 exposes **11 read tools and no writes** (Q3, Q7), tools only — no MCP resources or prompts (Q6).

```
 MCP client (Vercel AI SDK agent, Claude Code, ...)
        │  POST /mcp  (JSON-RPC over Streamable HTTP, stateless)
        │  Authorization: Bearer <marketlum API key>
        ▼
 ┌──────────────────────────────────────────────┐
 │ McpController (packages/core/src/mcp/)       │
 │   McpGuard: AuthGuard('api-key') only        │
 │   McpServer + StreamableHTTPServerTransport  │  @modelcontextprotocol/sdk
 │   McpToolRegistry ── permission filter ──────┼── PermissionsService (spec 020)
 └──────────────────┬───────────────────────────┘
                    ▼ direct service calls (no HTTP hop)
 ┌──────────────────────────────────────────────┐
 │ Core services: SearchService, AgentsService, │
 │ InvoicesService, OrdersService, Dashboard…   │
 └──────────────────────────────────────────────┘
```

## Protocol & Transport (Q2, Q13, Q14)

- **Implementation:** official `@modelcontextprotocol/sdk` — `McpServer` + `StreamableHTTPServerTransport`, hand-wired into a NestJS controller. No third-party bridge packages.
- **Transport:** Streamable HTTP, **stateless mode**: `sessionIdGenerator: undefined`, a fresh transport per request, no `Mcp-Session-Id`, no SSE stream, no server-initiated messages. `GET /mcp` and `DELETE /mcp` return 405 (stateless servers don't support them).
- **Server identity:** name `marketlum`, version read from the core package version.
- Because a new `McpServer` instance is built per request (needed anyway for per-caller tool filtering, see below), registration must be cheap: tool definitions are static singletons; only the wiring is per-request.

## Authentication (Q4)

- `POST /mcp` is guarded by a dedicated `McpGuard` = `AuthGuard('api-key')` — **API keys only**, reusing the spec 019 Passport strategy verbatim. JWT session cookies are **not** accepted on `/mcp` (asserted in BDD).
- `Authorization: Bearer <key>` → strategy resolves the key → `request.user`; the strategy's existing `lastUsedAt` touch applies unchanged.
- CSRF is already skipped for Authorization-header requests (spec 019 behavior) — no changes needed.
- Missing/invalid key → HTTP 401 (protocol-level failure, before any JSON-RPC handling) (Q12).

## Authorization (Q5, Q15)

Permissions are `resource:action` strings resolved via `PermissionsService.getEffectivePermissions(userId)` / `hasPermission()`. The HTTP-method inference in `PermissionCheckService` does not apply here (all MCP traffic is POST), so **each tool statically declares its required permission**, always with the `read` action in v1:

- **`tools/list`** returns only tools whose permission the caller holds (effective permissions computed once per request, then filtered).
- **`tools/call`** re-checks the permission before executing — a stale or forged call on a non-granted tool returns the `FORBIDDEN` tool error (below), never executes the service.

## Tool Catalog (Q7, Q8)

11 read-only tools, `verb_noun` snake_case. (The brainstorm's Q7 option said "13 tools" — that was a miscount of the roster's reads; the recurring-flows feature has since been removed from Marketlum, and during implementation the value-stream financials feature (spec 011) turned out to have been removed as well, so `get_value_stream_financials` was dropped and the roster is the 11 reads below.) Every tool wraps an existing core service call — no new query logic. Each description states what the tool returns **and when to use it** (agent-facing prose, written per tool during implementation).

| # | Tool | Underlying service call | Permission | Input schema (shared) |
|---|---|---|---|---|
| 1 | `search_market` | `SearchService` global full-text search | `search:read` | `mcpSearchMarketInputSchema` (query + pagination) |
| 2 | `search_agents` | `AgentsService` list | `agents:read` | list filters ⊆ existing agents query schema + pagination |
| 3 | `get_agent` | `AgentsService.findOne` | `agents:read` | `{ id: uuid }` |
| 4 | `get_agent_financials` | agent financials aggregates (spec 016) | `agents:read` | `{ id: uuid }` (+ existing period params if the service takes them) |
| 5 | `search_invoices` | `InvoicesService` list | `invoices:read` | list filters ⊆ existing invoices query schema + pagination |
| 6 | `get_invoice` | `InvoicesService.findOne` | `invoices:read` | `{ id: uuid }` |
| 7 | `search_orders` | `OrdersService` list | `orders:read` | list filters ⊆ existing orders query schema + pagination |
| 8 | `get_order` | `OrdersService.findOne` | `orders:read` | `{ id: uuid }` |
| 9 | `list_value_streams` | `ValueStreamsService` list | `value-streams:read` | pagination |
| 10 | `get_dashboard_summary` | `DashboardService` summary | `dashboard:read` | `{}` (presentation-currency semantics from spec 010 apply as-is) |
| 11 | `get_exchange_rate` | `ExchangeRatesService` lookup | `exchange-rates:read` | currency pair + optional date, ⊆ existing exchange-rate query schema |

Implementation note: "⊆ existing query schema" means the tool input is built with `pick`/`omit` from the corresponding `packages/shared/src/schemas/*.schema.ts` query schema (Q9) — the implementer takes the fields the REST list endpoint actually accepts; no new filter semantics are invented for MCP.

## Contracts

### Inputs (Q9)

- Per-tool input schemas live in **`packages/shared/src/schemas/mcp.schema.ts`**, derived from the existing schemas via `pick`/`omit`/`extend` (e.g. reusing `paginationQuerySchema`). Shared remains the single source of truth; core converts Zod → JSON Schema at registration (SDK helper or `zod-to-json-schema`).
- Also exported from shared: `MCP_TOOL_NAMES` (const tuple + type) and `McpToolErrorCode` (below), so BDD tests and clients import the same contract.
- Inputs are validated with the same Zod-validation approach as `ZodValidationPipe` semantics — a failed parse produces the `INVALID_INPUT` tool error, not a protocol error.

### Outputs (Q10, Q11)

- Tool results return **exactly the serialized shapes the REST endpoints return**, JSON-stringified into a single `text` content block. This keeps one tested serialization: decimal formatting (`Number(x).toFixed(2)`), currency snapshot fields, computed balances.
- List/search tools accept `page` / `limit` (default 20, max 100 — enforced in the shared MCP schemas) and return the REST list envelope verbatim: `{ data, meta: { page, limit, total, totalPages } }`. (The brainstorm said `pageSize`; the actual REST param is `limit`, and mirroring REST — the Q11 decision — wins.)

### Errors (Q12)

- **Protocol/JSON-RPC layer:** HTTP 401 for auth failures; JSON-RPC error responses for malformed JSON-RPC or unknown methods (SDK default behavior).
- **Tool layer:** domain failures return a normal result with `isError: true` and a single text block containing `{ "code": <McpToolErrorCode>, "message": string }`:

| Code | When |
|---|---|
| `FORBIDDEN` | caller lacks the tool's permission (call-time re-check) |
| `NOT_FOUND` | entity id doesn't exist |
| `INVALID_INPUT` | Zod parse failure (message includes flattened issues) |
| `INTERNAL` | unexpected service error (message sanitized; details go to logs) |

## Backend Module Layout

```
packages/core/src/mcp/
  mcp.module.ts                # imports Auth/Roles + the domain modules whose services tools use
  mcp.controller.ts            # POST /mcp — McpGuard, builds per-request McpServer + stateless transport
  mcp.guard.ts                 # AuthGuard('api-key') only
  mcp-tool.registry.ts         # holds McpToolDefinition[]; filters by effective permissions
  mcp-tool.interface.ts        # McpToolDefinition { name, description, permission, inputSchema, execute(user, input) }
  tools/
    search-market.tool.ts
    search-agents.tool.ts
    get-agent.tool.ts
    get-agent-financials.tool.ts
    search-invoices.tool.ts
    get-invoice.tool.ts
    search-orders.tool.ts
    get-order.tool.ts
    list-value-streams.tool.ts
    get-dashboard-summary.tool.ts
    get-exchange-rate.tool.ts
```

`McpModule` is imported unconditionally by `MarketlumCoreModule` (Q1). The registry is deliberately interface-driven so a future `mcpTools?: McpToolDefinition[]` on `MarketlumApiPlugin` can feed it — **that extension point is designed-for but NOT implemented in v1** (Q19).

New dependency in `@marketlum/core`: `@modelcontextprotocol/sdk` (plus `zod-to-json-schema` if the SDK's own conversion isn't used).

## Shared Package Additions

- `packages/shared/src/schemas/mcp.schema.ts` — per-tool input schemas, `MCP_TOOL_NAMES`, `mcpToolErrorSchema` / `McpToolErrorCode`.
- Export from `packages/shared/src/index.ts`.
- **Gotcha:** rebuild shared (`pnpm --filter @marketlum/shared build`) before API tests can see the new exports.

## Operational Behavior (Q16, Q17)

- **Throttling:** `/mcp` sits under the same global `@nestjs/throttler` policy as the REST API. No dedicated throttle in v1.
- **Logging:** one structured log line per `tools/call` — tool name, user id, duration ms, `isError` — via the Nest logger. No audit table, no domain events for tool calls in v1.
- **API-key attribution:** `lastUsedAt` updates via the existing strategy; no extra tracking.

## Database, Seeds, UI, Template Sync

- **Database:** no new entities, no migrations.
- **Seeds:** no changes (Q22). The documented setup path is: create a role with the desired `*:read` grants in the existing Roles UI → create an API key for a user holding that role in the existing API-keys UI.
- **Admin UI:** none in v1 (Q18).
- **Template sync:** not triggered — all changes land in `packages/core` and `packages/shared`; no `apps/api` or `apps/web` files change. (If implementation unexpectedly touches `apps/api`, mirror it to `packages/create-marketlum-app/template/` per `CLAUDE.md`.)

## BDD Test Coverage (Q20, Q21)

Feature files in `packages/bdd/features/mcp/`, step definitions in `apps/api/test/mcp/`, using the shared app instance (ref-counted), `createAuthenticatedUser()`, and the spec 019 API-key helpers. Tests POST raw JSON-RPC bodies with supertest and assert on the wire format.

| Feature file | Scenarios | Covers |
|---|---|---|
| `protocol.feature` | 3 | `initialize` handshake; unknown JSON-RPC method; GET /mcp → 405 |
| `authentication.feature` | 3 | no key → 401; invalid key → 401; JWT cookie (no key) → 401 |
| `tool-listing.feature` | 3 | Admin sees all 11; scoped role (e.g. only `invoices:read` + `search:read`) sees exactly its subset; role with no read grants sees an empty list |
| `tool-calls.feature` | 11 | one happy-path call per tool against seeded/fixture data, asserting REST-identical payloads incl. decimal formatting |
| `tool-errors.feature` | 4 | `FORBIDDEN` (calling an unlisted tool); `NOT_FOUND` (bad uuid); `INVALID_INPUT` (bad params); `limit` > 100 rejected |

**Total: 24 scenarios.** Per the strict-BDD rule, feature files and failing step definitions come first; implementation follows.

## Documentation (Q23)

New `## MCP Server` section in the root `README.md`:

- What it is, endpoint URL, auth setup (role → API key), permission model, the 11-tool catalog table.
- Copy-paste connection examples:
  - **Vercel AI SDK** — `experimental_createMCPClient` with the Streamable HTTP transport and the `Authorization` header.
  - **Claude Code** — `claude mcp add --transport http marketlum http://localhost:3001/mcp --header "Authorization: Bearer <key>"`.

## Out of Scope (v2+ candidates)

- **Write tools** (`create_order`, `transition_order`, `create_invoice`) — deferred until trust is established (Q3/Q7 override). When they land: revisit the audit-entity decision (Q17) and per-tool confirmation semantics.
- **Plugin-contributed tools** (`mcpTools?` on `MarketlumApiPlugin`) — seam designed, not built (Q19).
- **MCP resources & prompts** (Q6), **OAuth 2.1** (Q4), **stdio transport / CLI binary** (Q2), **stateful sessions / SSE** (Q14), **admin UI** (Q18), **dedicated MCP throttle** (Q16), **`mcp_tool_calls` audit entity / domain events** (Q17).

## Delivery Plan (Q24)

Single PR, in this order:

1. `@marketlum/shared`: `mcp.schema.ts` + exports; rebuild shared.
2. BDD feature files (`packages/bdd/features/mcp/`, 24 scenarios) + step definitions in `apps/api/test/mcp/` (failing).
3. Core MCP module: guard, registry, controller + stateless transport wiring, error mapping.
4. The 11 tool definitions.
5. Green test run (`pnpm test:e2e`), structured logging, README section.
