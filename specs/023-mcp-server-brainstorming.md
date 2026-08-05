# 023 — @marketlum/mcp: MCP Server for Marketlum

> **Goal:** Expose a curated, permission-aware tool surface over a Marketlum market to MCP-capable agents (Vercel AI SDK, Claude Code, Claude Desktop, etc.), authenticated with Marketlum API keys.

> **Process:** Append-only brainstorming. Each round asks questions with preselected recommendations (`[x]`). Move the `[x]` or write below `**Answer:**` to override; silence = acceptance. Rounds are appended, never edited.

## Context

What already exists and is relevant:

- **API keys (spec 019)** — `packages/core/src/api-keys/`, Passport strategy `api-key.strategy.ts`, guards accept `AuthGuard(['jwt', 'api-key'])`. Keys map to users; `Authorization: Bearer` requests skip CSRF. This is a ready-made auth channel for headless agents.
- **HRBAC (specs 020/021)** — permission checks folded into guards, resources declared in `packages/shared/src/permissions.ts`; plugins contribute `permissionResources`.
- **Plugin system (spec 012)** — `MarketlumApiPlugin` interface (`packages/core/src/plugins/marketlum-api-plugin.ts`): a package exports `{ manifest, module, entities?, migrations?, settings?, permissionResources?, seed? }` and downstream apps pass it to `MarketlumCoreModule.forRoot({ plugins })`.
- **Zod schemas in `@marketlum/shared`** — single source of truth for request validation; directly reusable as MCP tool input schemas.
- **Domain surface** — ~24 primary entities (agents, invoices, orders, value streams, recurring flows, exchange rates, dashboard aggregates, …) served by NestJS services in `packages/core/src/<domain>/`.
- **AI module** — `packages/core/src/ai/` already holds an `anthropic.client.ts` (used by invoice PDF import), so "AI-adjacent" code in core has precedent.

```
 MCP client (Vercel AI SDK agent, Claude Code, ...)
        │  Streamable HTTP / stdio + API key
        ▼
 ┌─────────────────────────────┐
 │ @marketlum/mcp              │  tools: search_invoices, get_agent_financials, ...
 │  (this spec)                │  auth: api-key → user → HRBAC
 └──────────────┬──────────────┘
                ▼ calls services (not HTTP)
 ┌─────────────────────────────┐
 │ @marketlum/core services    │  InvoicesService, AgentsService, DashboardService...
 └─────────────────────────────┘
```

---

## Round 1 — Foundations

This round pins down what `@marketlum/mcp` *is*: how it's packaged, how clients reach it, how broad the tool surface is, and how callers authenticate.

### Q1. Packaging: where does the MCP server live?

- [x] **Core module** (`packages/core/src/mcp/`) — always on for every market; no opt-in step. Trade-off: bloats core, forces the MCP dependency on every install.
- [ ] **Separate package `@marketlum/mcp` exporting a `MarketlumApiPlugin`** — installed and activated like plugin-nbp/plugin-rdhy via `forRoot({ plugins })`; optional, independently versioned, and dogfoods the plugin system. Its module imports core modules to reach services directly.
- [ ] **Standalone server process** (own port, talks to the API over HTTP) — strongest isolation, but doubles deployment surface and re-authenticates through REST instead of reusing services.

**Answer:**

### Q2. Transport & endpoint: how do MCP clients connect?

- [x] **Streamable HTTP mounted on the API** (e.g. `POST /mcp` on port 3001) — one deployment, works for remote agents (Vercel) and local clients alike; the modern MCP default transport.
- [ ] **Streamable HTTP + stdio binary** — adds a `marketlum-mcp` CLI for local Claude Desktop/Code use without network setup. Trade-off: second runtime path to maintain from day one.
- [ ] **stdio only** — simplest, but useless for a deployed Vercel agent; rules out the primary use case.

**Answer:**

### Q3. Tool surface breadth for v1

- [x] **Curated tool set (~10–15 tools)** — hand-picked, well-described reads plus a few high-value writes; each tool maps to an existing service call. Best agent ergonomics.
- [ ] **Read-only curated set** — safest, but an agent that can't create anything (e.g. an order or invoice) loses most of its usefulness.
- [ ] **Generated full CRUD mirror (~24 entities × 4-5 ops)** — maximal coverage, worst agent behavior (tool-choice confusion), and couples MCP to every controller change.

**Answer:**

### Q4. Authentication

- [x] **Marketlum API keys (spec 019) via `Authorization: Bearer`** — reuses the existing strategy, key → user → roles; nothing new to build or store.
- [ ] **Dedicated MCP token type** — separate lifecycle/scoping from API keys. Trade-off: duplicates spec 019 for little gain since API keys already scope via HRBAC.
- [ ] **OAuth 2.1 (MCP spec's remote-auth flow)** — most standards-compliant for third-party clients, but heavy; can be layered on later.

**Answer:**

### Q5. Authorization: how do tools respect HRBAC?

- [x] **Per-tool permission mapping** — each tool declares the same permission resource its underlying REST route is gated by (e.g. `invoices`, `agents.financials`); the key's user must hold it or the tool call fails (and, ideally, the tool is hidden from `tools/list`). Consistent with specs 020/021.
- [ ] **Single `mcp` permission resource** — one grant switches all of MCP on/off per role. Simpler, coarser; a read-only analyst role can't be expressed.
- [ ] **Admin-only** — MCP requires the Admin role. Simplest, but defeats HRBAC's purpose.

**Answer:**

### Q6. MCP primitives in v1: tools only, or also resources/prompts?

- [x] **Tools only** — tools are what agent frameworks (Vercel AI SDK) actually consume today; smallest correct v1.
- [ ] **Tools + resources** — expose read-only entities (e.g. system settings, taxonomies) as MCP resources too. Conceptually nice, but few clients use resources well yet.
- [ ] **Tools + resources + prompts** — full MCP surface. Trade-off: prompts/resources speculative; adds spec and test weight without a driving use case.

**Answer:**

---

## Round 2 — Tool Surface Shape

Round 1 settled: core module at `packages/core/src/mcp/`, Streamable HTTP at `POST /mcp`, curated tools, API-key auth, per-tool HRBAC, tools only. This round picks the actual roster and the contracts every tool follows.

### Q7. The v1 tool roster

Each tool maps 1:1 to an existing service call and declares the same permission resource as its REST route.

| Tool | Kind | Permission |
|---|---|---|
| `search_market` | read (global full-text via SearchService) | `search` |
| `search_agents` / `get_agent` | read | `agents` |
| `get_agent_financials` | read (spec 016 aggregates) | `agents` |
| `search_invoices` / `get_invoice` | read | `invoices` |
| `search_orders` / `get_order` | read | `orders` |
| `list_value_streams` / `get_value_stream_financials` | read (spec 011) | `value-streams` |
| `get_dashboard_summary` | read | `dashboard` |
| `get_exchange_rate` | read | `exchange-rates` |
| `create_order` / `transition_order` | write (spec 017 incl. 409-guarded transitions) | `orders` |
| `create_invoice` | write | `invoices` |

- [ ] **The roster above (16 tools)** — balanced reads + the three writes that make an agent useful (orders lifecycle, invoice creation).
- [    x] **Reads only from the roster (13 tools)** — defer all writes to a v2 once trust is established.
- [ ] **Roster minus financials/dashboard aggregates (~11 tools)** — smallest useful core; add analytics tools later.

**Answer:**

### Q8. Tool naming convention

- [x] **`verb_noun` snake_case** (`search_invoices`, `create_order`) — matches what agent frameworks and MCP examples use; verbs make intent obvious to the model.
- [ ] **`noun_verb` domain-grouped** (`invoices_search`, `orders_create`) — sorts nicely in listings; reads less naturally in model reasoning.
- [ ] **Dotted namespacing** (`marketlum.invoices.search`) — some MCP clients mishandle dots in tool names; risky.

**Answer:**

### Q9. Input schemas

- [x] **Reuse `@marketlum/shared` Zod schemas, trimmed per tool** — `pick`/`omit`/`extend` from the existing DTO schemas so MCP contracts can't drift from API validation; convert to JSON Schema at registration.
- [ ] **Hand-written per-tool Zod schemas** — freedom to design agent-first inputs, at the cost of a second contract to keep in sync.
- [ ] **Verbatim DTO schemas, no trimming** — zero maintenance, but leaks admin-form fields (e.g. UI-only coercions) into tool inputs.

**Answer:**

### Q10. Output format

- [x] **Same serialized shapes as the REST responses, returned as JSON text content** — one tested serialization (incl. the `Number(x).toFixed(2)` decimal rules and snapshot fields); agents handle JSON text fine.
- [ ] **Trimmed agent-friendly projections** — smaller contexts, but a third response contract to maintain and test.
- [ ] **MCP `structuredContent` + JSON Schema output declarations** — most typed, but client support is uneven and it doubles the schema surface.

**Answer:**

### Q11. Pagination & result caps for search/list tools

- [x] **`page`/`pageSize` params mirroring the REST list endpoints, default 20, max 100, response includes `total`** — consistent with the API; caps keep tool results context-friendly.
- [ ] **Fixed cap (e.g. top 50, no paging)** — simpler tools, but agents can't retrieve beyond the cap.
- [ ] **Cursor-based** — nothing else in Marketlum uses cursors; inconsistency for no gain at this scale.

**Answer:**

### Q12. Error mapping

- [x] **Domain/validation errors → tool results with `isError: true` and a structured `{ code, message }` payload** — the model can read the failure and self-correct (e.g. a 409 order-transition rule); JSON-RPC/protocol errors reserved for auth failures and malformed requests.
- [ ] **Everything as JSON-RPC errors** — spec-pure, but most clients surface these poorly and the model can't recover mid-loop.
- [ ] **`isError` with free-text message only** — simplest; loses the machine-readable code agents and tests can assert on.

**Answer:**

---

## Round 3 — Runtime & Operations

Round 2 settled a 13-tool read-only v1 with REST-consistent contracts. This round decides how the server is actually implemented inside NestJS and how it behaves operationally.

### Q13. Implementation approach

- [x] **Official `@modelcontextprotocol/sdk` (`McpServer` + `StreamableHTTPServerTransport`) hand-wired into a Nest controller** — first-party protocol handling, full control over auth/DI integration, one well-understood dependency.
- [ ] **Third-party `@rekog/mcp-nest`** — decorators feel Nest-native, but adds a community dependency between core and the protocol; version lag risk.
- [ ] **Hand-rolled JSON-RPC handler** — no dependencies, but re-implements protocol negotiation/versioning that the SDK maintains for free.

**Answer:**

### Q14. Streamable HTTP session model

- [x] **Stateless mode** (no `Mcp-Session-Id`, each POST independent, no SSE stream) — the SDK supports this; fits API-key auth and horizontal scaling, and read-only tools need no server-held state. Clients like the Vercel AI SDK work fine with it.
- [ ] **Stateful sessions with `Mcp-Session-Id`** — required only for server-initiated messages (notifications, sampling), which v1 doesn't use; adds a session store for nothing.
- [ ] **Stateful + SSE resumability** — full spec surface; meaningful only for long-lived subscriptions, out of scope for v1.

**Answer:**

### Q15. `tools/list` behavior under HRBAC

- [x] **Filter the list by the caller's permissions AND enforce at call time** — the agent never sees tools it can't use (better tool choice), and a race/stale-list call still fails safely.
- [ ] **Full list, enforce at call time only** — simpler, but the model wastes turns attempting forbidden tools.
- [ ] **Full list with a `permission` annotation per tool** — informative, but agents don't reliably read annotations; still wastes turns.

**Answer:**

### Q16. Rate limiting on `/mcp`

- [x] **Same `@nestjs/throttler` default as the REST API** — one policy to reason about; agents behave like any other API-key consumer.
- [ ] **Dedicated (higher) MCP throttle** — agent loops burst harder than humans; premature until observed in practice.
- [ ] **No throttling on `/mcp`** — leaves the endpoint open to runaway agent loops.

**Answer:**

### Q17. Observability

- [x] **Structured logs per tool call (tool, user, duration, isError) + the existing API-key `lastUsedAt` touch** — enough to debug and attribute usage; no new tables.
- [ ] **Dedicated `mcp_tool_calls` audit entity** — queryable history in the admin UI; defer until write tools land in v2, where auditability actually matters.
- [ ] **Emit domain events per tool call** (`marketlum.mcp.tool_called`) — puts high-frequency read noise on the event bus that subscribers must filter.

**Answer:**

### Q18. Admin UI in v1

- [x] **None — documentation only** (README + docs section: endpoint URL, auth, tool catalog) — a read-only MCP server has nothing to configure; keys are already managed in the existing API-keys UI.
- [ ] **Status card on the API-keys page** — shows the MCP endpoint URL and tool count; small but touches `apps/web` + template sync for marginal value.
- [ ] **Full MCP page** (tool catalog, per-role visibility preview) — nice v2+ material once write tools/audit exist.

**Answer:**

---

## Round 4 — Extensibility, Testing & Delivery

Final round: how tools are registered internally, whether plugins can contribute tools, BDD coverage, seeds, docs, and PR shape. (Since everything lives in `packages/core` and no `apps/api`/`apps/web` files change, the template-sync rule is not triggered — the delivery question confirms this.)

### Q19. Internal tool registry & plugin extensibility

- [x] **Registry service in `packages/core/src/mcp/` with tool definitions in `mcp/tools/*.tool.ts`; design the registry interface so plugins can contribute tools later, but don't extend `MarketlumApiPlugin` yet** — colocated, discoverable, and leaves a clean seam for `mcpTools?` in v2 (e.g. plugin-rdhy exposing VAM tools).
- [ ] **Add `mcpTools?: McpToolDefinition[]` to `MarketlumApiPlugin` now** — completes the story early, but no plugin needs it yet and the tool contract may still shift with v2 writes.
- [ ] **Tools defined inside each domain module** (`invoices/`, `agents/`…) — keeps tools near services, but scatters the MCP surface across 10 modules and blurs module boundaries.

**Answer:**

### Q20. BDD test strategy

- [x] **supertest JSON-RPC POSTs to `/mcp` from `apps/api/test/mcp/`, feature files in `packages/bdd/features/mcp/`** — same stack as every other suite (shared app instance, `createAuthenticatedUser()`, API-key helpers from spec 019); asserts on raw protocol responses.
- [ ] **Official MCP client SDK as the test driver** — closest to real clients, but introduces a second test harness style and hides the wire format the tests should pin down.
- [ ] **Unit tests only on the registry/handlers** — misses transport, auth, and HRBAC integration, which is where the risk is.

**Answer:**

### Q21. Scenario coverage depth

- [x] **~20 scenarios: protocol (initialize, unknown method), auth (no key, invalid key, JWT-cookie rejection if applicable), `tools/list` filtering for 2–3 role shapes, one happy-path call per tool (13), plus error-mapping cases (not-found, invalid input, forbidden tool)** — every tool exercised once; shared behaviors tested centrally, not per tool.
- [ ] **Deep per-tool coverage (filters, pagination edges per tool)** — the underlying services are already covered by their own suites; this would re-test them through a second transport.
- [ ] **Smoke only (list + one call)** — too thin for a permission-sensitive surface.

**Answer:**

### Q22. Seed data

- [x] **No seed changes; document creating a scoped role + API key as the setup path** — existing `seed:sample` data is what the tools read; MCP adds no entities.
- [ ] **Seed a demo "Market Analyst" role** (read grants matching the 13 tools) — nice demo, but seeds grow stale against the roster and roles are two clicks in the existing UI.
- [ ] **Seed a demo API key** — keys are secrets; seeding one is an anti-pattern.

**Answer:**

### Q23. Documentation placement

- [x] **`README.md` section + connection examples (Vercel AI SDK `experimental_createMCPClient`, Claude Code `claude mcp add`)** — the repo documents features in the root README today; examples make adoption a copy-paste.
- [ ] **New `docs/mcp.md`** — starts a docs directory convention the repo doesn't have yet; do it when a docs site exists.
- [ ] **Tool descriptions only, no prose docs** — self-describing via `tools/list`, but leaves connection/auth setup undocumented.

**Answer:**

### Q24. Delivery shape

- [x] **Single PR: shared additions → mcp module (registry, guard integration, controller/transport) → tools → BDD features/steps → README** — read-only scope is small enough for one reviewable unit; BDD-first ordering per the project workflow.
- [ ] **Two PRs (infra then tools)** — cleaner review slices, but the infra PR alone ships nothing testable end-to-end.
- [ ] **Tool-by-tool PRs** — maximal granularity, disproportionate overhead for 13 thin wrappers.

**Answer:**
