# 007 — Agents Map

> **Goal:** Under `/admin/agents/map`, plot every agent on an interactive map using its primary address as the location.

> **Process:** Append-only. We add one round per turn; you reply by moving `[x]` to the option you want and/or writing free-form text after `**Answer:**`. Existing content is never rewritten.

## Context

Spec 006 just landed agent addresses (`packages/core/src/agents/addresses/entities/address.entity.ts`). An `Address` carries free-text `line1 / line2 / city / region / postalCode` plus a Geography FK (`countryId` constrained to `type='country'`). It does **not** carry lat/lng. The "primary address" is the row flagged `isPrimary=true`, with read-time auto-promotion of the most-recently-created when none is flagged.

The `Geography` tree (`packages/core/src/geographies/geography.entity.ts`) has `name + code + type` and no coordinate columns either.

So the brainstorm has to settle a chain: precision → coordinate source → storage → geocoding provider (if any) → map library → how to display agents that can't be plotted.

```
   ┌──────────┐      ┌────────────┐      ┌────────────┐
   │  Agent   │─────▶│  Address   │─────▶│ Geography  │
   │ (n=many) │      │ (primary)  │      │ (country)  │
   └──────────┘      └────────────┘      └────────────┘
                          │
                          ▼  ?
                    ╔════════════╗
                    ║ lat / lng  ║
                    ╚════════════╝
```

Sidebar nav lives at `packages/ui/src/layouts/admin-layout.tsx`; today `/admin/agents` is a single entry. We'll add the map page; whether it also gets a sidebar entry is part of Round 3.

Web app re-exports pages from `@marketlum/ui`. Anything we add under `apps/web/src/app/admin/agents/map/` must be mirrored in `packages/create-marketlum-app/template/web/...` per `CLAUDE.md`.

---

## Round 1 — Foundations: where do coordinates come from?

The whole feature hinges on one question: how do we turn a street address into a lat/lng. Every other choice cascades from this. Six questions to settle the data flow.

### Q1.1 — Precision

What spatial resolution do we need?

```
country centroid ─────────────►   one pin per country (≈250 possible spots)
city centroid     ────────────►   one pin per (city, country) tuple
exact street      ────────────►   one pin per unique line1+city
```

- [ ] **City-level (`city + country` → lat/lng)** — readable map at country/region zoom, cheap to geocode (~one lookup per unique city), good enough for "where are our agents".
- [ ] **Country-level (centroid of the `countryId`)** — zero external calls, but every agent in the US gets the same pin in Kansas; defeats the point of having addresses.
- [x] **Exact street-level (full address line1+city+country)** — most precise, but every new/edited address triggers a geocode and zooming out makes pins overlap badly anyway.

**Answer:**

### Q1.2 — Coordinate storage

Where do `lat` and `lng` live in the schema?

- [x] **New nullable `latitude` / `longitude` columns on `addresses`, populated by the geocoder** — keeps the data close to the address that owns it, supports per-address override, cascade-deletes naturally with the address row.
- [ ] **Separate `address_geocodes` cache table keyed by `(country, city)`** — dedupes across agents in the same city, but adds a join on every map render and means the address row alone can't be plotted.
- [ ] **Add `centroidLat / centroidLng` to `geographies` (country level only)** — couples geocoding to the geography model; only viable if Q1.1 picked country-level.

**Answer:**

### Q1.3 — Geocoding provider

Which service turns "Warszawa, Poland" into 52.23, 21.01?

- [ ] **OpenStreetMap Nominatim, self-hosted-policy compliant (1 req/s, descriptive User-Agent)** — free, no API key, decent global coverage; downside is the rate limit and "best-effort" address resolution.
- [x] **Google Maps Geocoding API** — most accurate, but requires a paid API key, billing setup, and a key-management story; overkill for an internal admin map.
- [ ] **Mapbox Geocoding API** — competitive accuracy and price, free tier covers small teams; still introduces a paid dependency we don't have yet.
- [ ] **No external geocoder — populate lat/lng manually in the address form** — zero infra dependency, maximum drudgery for the admin user.

**Answer:**

### Q1.4 — When does geocoding happen?

Triggering strategy:

- [x] **Synchronously on Address create / update, in the service layer; failures store `null` and log a warning** — fresh data on every save, the admin user sees the result immediately, no background machinery; the per-request 1s Nominatim throttle is fine because address writes are single-row admin actions.
- [ ] **Asynchronously via a background job (BullMQ or similar)** — robust against API stalls, but adds a queue + worker we don't have today.
- [ ] **Lazily on map-page load (geocode rows that are still NULL before responding)** — defers cost to a heavyweight endpoint and makes the first map-load slow when there are many addresses.

**Answer:**

### Q1.5 — Map library

Which renderer for the interactive map itself?

- [x] **`react-leaflet` + Leaflet + OSM tiles** — mature, OSS, no API key, well-trodden React story; pairs naturally with Nominatim (same OSM ecosystem); supports clustering plugins.
- [ ] **`react-map-gl` + MapLibre GL JS + free vector tile source** — modern WebGL renderer, smoother pan/zoom, but heavier bundle and a tile-provider decision still to make.
- [ ] **`react-map-gl` + Mapbox GL JS** — best-in-class visuals, but ties us to a paid Mapbox token.
- [ ] **`react-simple-maps` (D3-based, vector country outlines)** — lightweight and no tiles, but no pan/zoom-to-street and no clustering; really for choropleths.

**Answer:**

### Q1.6 — Agents with no plottable address

What about agents that have no primary address, or whose address failed to geocode?

- [ ] **Exclude from the map, but show a side panel "N agents not on the map" with their names** — clear visual signal something is missing, gives the admin an actionable list to fix, no fake placement.
- [x] **Hide silently** — minimal noise, but the admin has no idea any agents are missing.
- [ ] **Drop a pin at `(0,0)` ("Null Island")** — funny, but pollutes the map and confuses the count.
- [ ] **Plot at the country centroid as a fallback** — partial recovery, but blurs the "where exactly" intent and requires storing country centroids somewhere.

**Answer:**

---

## Round 2 — Shape & geocoding mechanics

Now we settle the column types, the Google Maps integration, the error / retry / backfill story, and whether lat/lng is editable.

### Q2.1 — Column shape

What's the actual SQL type for `latitude` and `longitude` on `addresses`?

- [x] **`numeric(10, 7)` each, nullable** — exact decimal arithmetic, ~1.1 cm precision at the equator, plays cleanly with Postgres comparisons and is easy to (de)serialise as a string from TypeORM.
- [ ] **`double precision`** — slightly faster, smaller, but binary float bits can drift through JSON round-trips and TypeORM treats them as `number` (16-digit precision is fine, but loses parity with the spec-006 decimal convention).
- [ ] **PostGIS `geography(Point, 4326)` column** — proper geometry, opens up spatial queries (radius search, etc.); requires the PostGIS extension, which we don't currently use.

**Answer:**

### Q2.2 — API key & client wiring

Where does the Google API key come from and how is the HTTP call wired?

- [x] **`GOOGLE_MAPS_API_KEY` env var, read once in a Nest provider (`GeocodingModule` exporting `GEOCODING_CLIENT`), `@googlemaps/google-maps-services-js` for the call** — mirrors how we wired Anthropic for spec 005 (env var + DI Symbol + thin client); SDK handles retries and types; if the env is unset, geocoding silently no-ops and writes `null`.
- [ ] **Raw `fetch` to `https://maps.googleapis.com/maps/api/geocode/json` (no SDK)** — one fewer dependency, but we re-implement timeouts and response parsing.
- [ ] **A new `apps/api` service module instead of `packages/core/ai`-style placement** — easier reach from the addresses module but harder to reuse from a future seeder or CLI.

**Answer:**

### Q2.3 — Error / partial-match handling

Geocoding can fail (network, quota, `ZERO_RESULTS`, `OVER_QUERY_LIMIT`). What does the service do?

- [x] **On any non-OK result, log a warning with the address id + Google status, write `null` to lat/lng, never throw** — the address save succeeds regardless; the map silently drops it (per Q1.6); admin can edit-and-resave to retry.
- [ ] **Throw on non-OK and refuse to save the address** — strongest data quality, but blocks the admin from saving a real but unmappable address (rural areas, freshly built streets).
- [ ] **On partial match, still store the best candidate's coordinates** — keeps coverage high, but quietly trusts Google's "close enough" choice; subject to the same admin-can-fix-later workflow as the silent-null option above.

**Answer:**

### Q2.4 — Re-geocode trigger on update

When an address is PATCHed, when do we re-call the geocoder?

- [x] **Only when one of `line1 / line2 / city / region / postalCode / countryId` actually changes** — avoids burning quota when only `label` or `isPrimary` flips; trivially detectable in the service diff.
- [ ] **Always on PATCH (any field)** — simpler, but wastes quota on label-only or primary-toggle edits which are common.
- [ ] **Only when the user explicitly clicks a "re-geocode" button** — gives full control, but most users will forget and we'll quietly drift.

**Answer:**

### Q2.5 — Backfill for existing addresses

After the migration adds the columns, what happens to addresses created before this PR?

- [ ] **One-off CLI command `pnpm geocode:backfill` that loops over rows with `null` lat/lng, geocodes them at the 50 req/s Google free tier, logs results** — explicit, idempotent, doesn't block deploy; the seed sample re-runs the geocoder on insert anyway.
- [ ] **Migration runs the geocoder inline** — couples schema migration to an external API call; bad practice (slow, fragile, requires API key during deploy).
- [ ] **Lazy: the map endpoint geocodes any null rows on first request** — slow first paint, ties cost to the busiest request, no observability.
- [x] **No backfill — only newly-saved addresses get coordinates** — simplest, but the existing seed data starts invisible to the map.

**Answer:**

### Q2.6 — Manual override

Can an admin manually correct or set `latitude` / `longitude` from the address form?

- [x] **No (read-only) — coordinates are always Google's result; if it's wrong, fix the address text and re-save** — keeps a single source of truth, no Schrödinger's coords; manual nudging is an edge case we can add later.
- [ ] **Yes, with two extra inputs in the Address form (numeric, optional)** — handy for that one weird address Google won't geocode; adds validation surface and a "user override vs stale geocode" tracking concern.
- [ ] **Hidden by default; visible via a "show advanced" toggle** — middle ground; still introduces the override semantics in v1.

**Answer:**

### Q2.7 — Response shape

Does `latitude / longitude` show up in the public API?

- [x] **Yes, included in `AddressResponse` (nullable strings, matching the decimal convention from spec 002/006)** — the map page reads it directly via the existing `GET /agents` payload (which already embeds primary address); no new endpoint, no parallel fetch.
- [ ] **No — expose only via a new `GET /agents/map` endpoint that returns `[{ agentId, lat, lng }]`** — narrower payload, but duplicates data and gives us two shapes of "where is this agent".
- [ ] **Only via `GET /agents/:id`, not in lists** — pushes N round-trips onto the map page; rejected.

**Answer:**

---

## Round 3 — UI / UX

With the data sorted, we shape the page itself: viewport, pin appearance, clustering, click behaviour, filters, and how the user gets to the map.

### Q3.1 — Initial viewport

How does the map open?

```
   [ Auto-fit to pins ]       [ Fixed world view ]      [ Last-used (persist) ]
       ┌────────┐                 ┌────────┐                ┌────────┐
       │  ✦ ✦   │                 │ 🌍 all │                │ where  │
       │ ✦ ✦ ✦  │                 │ tiles  │                │ I left │
       └────────┘                 └────────┘                └────────┘
```

- [x] **Auto-fit (`map.fitBounds(pinCluster, { padding: 50 })`) — at most every plottable pin is visible on first paint** — most informative default; degrades gracefully to a sensible zoom for single-pin or empty cases.
- [ ] **Fixed world view (zoom 2, center 0,0)** — predictable but wasteful when all agents are in Europe.
- [ ] **Persist last-used viewport per user in `localStorage`** — power-user nicety, but extra plumbing and surprising on first visit.

**Answer:**

### Q3.2 — Pin styling

What does each marker actually look like?

```
   ●   simple             ⚫🟢🔵  by type             [photo] image-circle
```

- [x] **Color-coded by `AgentType` (organization / individual / virtual), default Leaflet marker shape with a small badge** — instantly readable, no new asset pipeline; matches the existing `AgentTypeBadge` colour story.
- [ ] **Plain default Leaflet pins, uniform colour** — simplest, but the map loses information density.
- [ ] **Circular avatar markers using `agent.image` (fallback to type-coloured pin)** — most "alive", but heavier (image loading per pin) and breaks clustering icon design.
- [ ] **Type-shaped SVGs (building / person / bot)** — most expressive, but bespoke icon work for v1.

**Answer:**

### Q3.3 — Clustering

When N agents are close together at low zoom, how do they render?

- [x] **`leaflet.markercluster` plugin: clusters at low zoom, spiderfy when zoomed in / clicked** — battle-tested, handles the "20 agents in Warsaw at zoom 4" case gracefully, ships a "+N" bubble.
- [ ] **No clustering — let pins overlap** — simplest, but at world zoom the same office cluster becomes a single illegible blob.
- [ ] **Custom hover-to-spread implementation** — looks slick but is a rabbit hole we don't need to dig in v1.

**Answer:**

### Q3.4 — Click a pin

What happens when the admin clicks one of those pins?

- [x] **Open a Leaflet popup with: agent name, type badge, primary address (multi-line), and a "View agent →" link to `/admin/agents/{id}`** — keeps context, lets the user decide whether to deep-dive; standard map UX.
- [ ] **Navigate immediately to `/admin/agents/{id}`** — one less click, but loses the map context for further exploration.
- [ ] **Slide-in panel on the right with full agent detail (taxonomies, all addresses, values count)** — richest view, but doubles the components to build and probably belongs on the detail page.

**Answer:**

### Q3.5 — Filters

What filters live above the map?

- [x] **Three filter chips: AgentType (dropdown), Taxonomy (combobox), Country (the new `<CountryCombobox>` from spec 006)** — matches the existing list page's filter affordances; lets the user narrow to e.g. "all organisations in Poland".
- [ ] **Same as above, plus a free-text search by agent name** — useful but redundant once you can click pins; adds noise.
- [ ] **No filters in v1** — minimal scope, but the map gets useless once we have >50 agents.

**Answer:**

### Q3.6 — How the admin finds the map

Where do we put the entry point?

- [x] **A "Map" button on `/admin/agents` list-page toolbar (next to the existing Create / filter chips), linking to `/admin/agents/map`** — discoverable from the agents context, no new top-level nav clutter.
- [ ] **A second nav item "Agents map" in the sidebar's Exchange group, below "Agents"** — single-click access from anywhere, but bloats the sidebar.
- [ ] **Both — a toolbar button AND a sidebar item** — maximum discoverability, modest redundancy.
- [ ] **A tab strip on the agents page (List / Map), URL `/admin/agents` vs `/admin/agents/map`** — closer integration but reworks the page shell; bigger refactor than the feature warrants.

**Answer:**

### Q3.7 — Loading & empty states

The first paint can show a few different states. How do we handle them?

- [x] **Skeleton (full-width grey rectangle) while `/agents` is in flight; empty-state card ("No mappable agents yet") when zero agents have non-null coords** — consistent with the rest of the admin's loading patterns; the empty card links back to the agents list.
- [ ] **Spinner + "Loading map..." text** — works, but less polished than a skeleton.
- [ ] **Render the map immediately and pop pins in as data arrives** — slickest, but flashes a worldview briefly which looks like a bug.

**Answer:**

---

## Round 4 — Integration, security, delivery

Last round: dependencies, BDD scope, permissions, env var rollout, and PR shape.

### Q4.1 — Permissions

- [x] **Behind `AdminGuard` — same posture as all the other admin endpoints; no end-user reach** — `AddressesService` already runs under `AdminGuard` (controller-level), and the map page is admin-only.
- [ ] **No guard / public** — leaks the agent roster, not viable.

**Answer:**

### Q4.2 — New dependencies

The PR introduces several deps. Confirm or trim?

| Package | Pkg | Why |
|---|---|---|
| `@googlemaps/google-maps-services-js` | `packages/core` | Geocoder client (Q2.2) |
| `react-leaflet` | `packages/ui` | React bindings |
| `leaflet` | `packages/ui` | Map renderer (peer of react-leaflet) |
| `@types/leaflet` | `packages/ui` | TS types |
| `leaflet.markercluster` | `packages/ui` | Cluster plugin (Q3.3) |
| `@types/leaflet.markercluster` | `packages/ui` | TS types |

- [x] **Add all six packages, pinned at current latest stable** — minimum kit for the feature.
- [ ] **Drop `leaflet.markercluster` and ship without clustering for v1** — saves one dep, but contradicts Q3.3.
- [ ] **Replace `react-leaflet` with a thin custom Leaflet wrapper** — fewer deps, more code we maintain.

**Answer:**

### Q4.3 — Geocoder no-key behaviour

When `GOOGLE_MAPS_API_KEY` is unset (dev, CI), what does the service do?

- [x] **Log once at startup, silently no-op on geocode calls, write `null`** — keeps dev/CI environments working without forcing key management; matches how Anthropic graceful-fallback was wired for spec 005.
- [ ] **Throw at startup so misconfiguration is loud** — louder, but breaks every dev who hasn't set the key and bricks BDD CI.
- [ ] **Throw on each geocode attempt** — chatty error logs without preventing other operations.

**Answer:**

### Q4.4 — BDD coverage

Strict-BDD project. What scenarios do we add?

Backend (geocoding integration):

| File | Scenarios | # |
|---|---|---|
| `geocode-on-create.feature` | success populates lat/lng; ZERO_RESULTS writes null; missing API key writes null | 3 |
| `geocode-on-update.feature` | re-geocodes when line1 changes; does NOT re-geocode on label-only PATCH; failure clears lat/lng | 3 |
| `address-response-coords.feature` | `GET /agents/:id` and `GET /agents` include `latitude`/`longitude` on the embedded primary address | 2 |

All tests stub the Google client with a `GeocodingClient` test double registered in the test module (similar to how `ANTHROPIC_CLIENT` was stubbed for spec 005's BDD coverage).

UI / map page is **not** covered by BDD (the map renderer is hard to test headlessly; the page reads the same `GET /agents` payload covered above).

- [ ] **8 new backend BDD scenarios as tabled; no UI BDD** — matches the project's posture and pre-existing pattern for external-client integrations.
- [ ] **Add a Playwright/Cypress UI smoke for the map page** — useful but introduces a new test stack.
- [x] **No new BDD; ship and manually verify** — violates the strict-BDD rule.

**Answer:**

### Q4.5 — Migration

- [x] **Single hand-written migration `1700000000044-AddAddressLatLng.ts` adding two nullable `numeric(10,7)` columns** — minimum surface, no indices (geo-lookup is not in scope; map fetch is `getMany` of all rows with non-null coords).
- [ ] **Same migration but also adds a GIST index for nearest-neighbour queries** — premature; no consumer of spatial queries yet.

**Answer:**

### Q4.6 — Seed data

Per Q2.5 we picked "no backfill". The existing spec-006 seeder creates addresses without coords; re-running `pnpm seed:sample -- --reset` will go through the (now geocoding-aware) `AddressesService.create` and pick up coords for the seeded 5 sample addresses.

- [ ] **No changes to the seeder itself — geocoding happens on save** — keeps the seeder declarative; assumes `GOOGLE_MAPS_API_KEY` is set when seeding (otherwise the seed runs and the map shows nothing, which is acceptable).
- [x] **Add hard-coded lat/lng to the seed entries as a fallback when no API key** — ensures the dev environment shows pins even without a key; adds churn to the seeder.

**Answer:No geocoding should be done when loading seed data.**

### Q4.7 — Delivery (PR shape)

- [x] **Single PR — migration + Geocoding module + Address service update + AddressResponse extension + Map page + sidebar toolbar button + BDD + template sync + 2 new env-example entries** — the surface is contained.
- [ ] **Two PRs: (PR1) backend geocoding + migration + BDD; (PR2) UI map page** — useful only if PR1 has a non-map consumer waiting, which it doesn't.

**Answer:**

### Q4.8 — `.env.example` & template sync

- [x] **Add a commented `# GOOGLE_MAPS_API_KEY=` line to the root `.env.example` and to `packages/create-marketlum-app/template/_env.example.tmpl`** — matches how the Anthropic key was rolled out in spec 005; non-mandatory in dev.
- [ ] **Require the key (uncommented placeholder)** — breaks freshly-cloned dev envs.

**Answer:**
