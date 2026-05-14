# 007 — Agents Map (Specification)

> Spec status: ready for implementation. Decision trail: [`007-agents-map-brainstorming.md`](./007-agents-map-brainstorming.md).

## 1. Overview

A new admin page at `/admin/agents/map` plots every agent that has a primary address with valid coordinates on an interactive Leaflet map. The `Address` entity (spec 006) gains nullable `latitude` and `longitude` columns that the service layer populates synchronously via the Google Maps Geocoding API when an address is created or its postal fields change. Agents whose primary address has no coords are simply absent from the map (no side panel, no fallback pin). The seed path skips geocoding entirely and writes coordinates directly.

```
   ┌──────────┐    ┌────────────────┐    geocode    ┌──────────────┐
   │  Agent   │───▶│   Address      │──────────────▶│ Google Maps  │
   │          │    │ (primary)      │               │ Geocoding API│
   └──────────┘    │ + lat / lng    │◀──────────────└──────────────┘
                   └────────────────┘
                          │
                          ▼ embedded in AgentResponse.addresses[0]
                   ┌────────────────┐
                   │  /admin/agents │
                   │      /map      │   react-leaflet + clustering
                   └────────────────┘
```

## 2. Domain model

### 2.1 `Address` extension

Two new columns on the existing `addresses` table:

| Column      | Type            | Nullable | Notes                                     |
|-------------|-----------------|----------|-------------------------------------------|
| `latitude`  | `numeric(10,7)` | yes      | Populated by geocoder; null on failure    |
| `longitude` | `numeric(10,7)` | yes      | Ditto                                     |

No indices in this PR (geo queries are out of scope; map fetch is a plain `WHERE latitude IS NOT NULL`).

### 2.2 Zod schemas

`packages/shared/src/schemas/address.schema.ts` — `addressResponseSchema` gains:

```ts
latitude: z.string().nullable(),   // decimal string, e.g. "52.2296756"
longitude: z.string().nullable(),
```

`createAddressSchema` and `updateAddressSchema` **do not** accept lat/lng — they are derived, not user-supplied (Q2.6).

### 2.3 AgentResponse cascade

`AgentResponse.addresses[]` already embeds full `addressResponseSchema` (spec 006). The new fields flow through automatically. No separate map endpoint.

## 3. Geocoding

### 3.1 Module layout

```
packages/core/src/geocoding/                  (new)
├── geocoding.module.ts
├── geocoding.client.ts                       (interface + token + real impl)
└── index.ts                                  (public exports)
```

Mirrors the spec-005 `ai/` module pattern: a `GEOCODING_CLIENT` Symbol token bound to a real client via `useFactory`, replaceable in tests.

### 3.2 `GeocodingClient` interface

```ts
export const GEOCODING_CLIENT = Symbol.for('GEOCODING_CLIENT');

export interface GeocodingClient {
  /**
   * Returns null if:
   *  - no GOOGLE_MAPS_API_KEY configured
   *  - Google returns ZERO_RESULTS / OVER_QUERY_LIMIT / REQUEST_DENIED / INVALID_REQUEST
   *  - network / parse error
   * Never throws.
   */
  geocode(input: GeocodeInput): Promise<{ latitude: string; longitude: string } | null>;
}

export interface GeocodeInput {
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  countryName: string;     // resolved from countryId at the call site
}
```

### 3.3 Real implementation

`RealGeocodingClient` uses `@googlemaps/google-maps-services-js`:

```ts
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  this.logger.warn('GOOGLE_MAPS_API_KEY not set — geocoding disabled');
}

const address = [
  input.line1,
  input.line2,
  [input.postalCode, input.city].filter(Boolean).join(' '),
  input.region,
  input.countryName,
].filter(Boolean).join(', ');

const res = await client.geocode({
  params: { address, key: apiKey, language: 'en' },
  timeout: 5_000,
});

if (res.data.status !== 'OK' || res.data.results.length === 0) {
  this.logger.warn(`geocode failed status=${res.data.status} address="${address}"`);
  return null;
}
const loc = res.data.results[0].geometry.location;
return {
  latitude: Number(loc.lat).toFixed(7),
  longitude: Number(loc.lng).toFixed(7),
};
```

Catches all errors → logs → returns `null` (Q2.3).

### 3.4 Integration with `AddressesService` (spec 006)

`packages/core/src/agents/addresses/addresses.service.ts` is extended:

- **Create**: after persisting, resolve `country.name` via the existing `geographiesRepository`, call `geocode()`, write the returned `{ latitude, longitude }` (or `null` on failure) back to the row in a follow-up update.
- **Update**: compare the incoming `UpdateAddressInput` against the existing row. If any of `line1 / line2 / city / region / postalCode / countryId` differ, re-geocode. If only `label` or `isPrimary` changes, skip (Q2.4).
- **Seed path bypass**: `AddressesService.create` accepts an optional second arg `{ skipGeocode?: boolean }` (default `false`). Seeders pass `{ skipGeocode: true }` and supply explicit coords via a new optional `latitude / longitude` pair on a private seed-only input type (NOT exposed via the API).

```ts
async create(
  agentId: string,
  input: CreateAddressInput,
  opts?: { skipGeocode?: boolean; latitude?: string; longitude?: string },
): Promise<Address> { /* ... */ }
```

Public Zod schema is unchanged; the `opts` argument is only reachable from server-side seeders.

## 4. API surface

| Method | Path                                      | Change |
|--------|-------------------------------------------|--------|
| GET    | `/agents`                                 | `addresses[]` now includes `latitude`, `longitude` (nullable strings). |
| GET    | `/agents/:id`                             | Ditto.                                                                  |
| GET    | `/agents/:agentId/addresses[/:id]`        | Each `AddressResponse` includes `latitude`, `longitude`.                |
| POST   | `/agents/:agentId/addresses`              | Service geocodes on save; response carries the resulting coords (or nulls). |
| PATCH  | `/agents/:agentId/addresses/:id`          | Re-geocodes only when one of the postal fields changes (Q2.4).          |

No new endpoints (Q2.7).

## 5. UI / UX

### 5.1 Page

`/admin/agents/map` — new App Router page that re-exports `AgentsMapPage` from `@marketlum/ui`.

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to agents                       [Type ▾] [Taxonomy ▾] │
│                                        [Country ▾]           │
│ ┌────────────────────────────────────────────────────────┐   │
│ │  ●  Warsaw                                             │   │
│ │       ●  ●                                             │   │
│ │  ●                  London                             │   │
│ │                  ●  ●                                  │   │
│ │                                                        │   │
│ │            (Leaflet OSM tiles, attribution bottom-rt)  │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Components

New components in `packages/ui/src/`:

| File | Purpose |
|------|---------|
| `pages/admin/agents-map-page.tsx`               | Page shell; owns filter state, fetches `/agents?limit=500&type=&taxonomyId=&countryId=`, hands plottable agents to the map component. |
| `components/agents/agents-map.tsx`              | Pure map renderer: `react-leaflet` `<MapContainer>` + `<TileLayer>` + `<MarkerClusterGroup>`; auto-fits to pins on mount (Q3.1). |
| `components/agents/agents-map.css`              | Imports leaflet + markercluster CSS, mounts marker colour overrides per `AgentType`. |
| `components/agents/agent-map-marker.tsx`        | Single `<Marker>` with a coloured icon (per Q3.2) and a `<Popup>` containing name, `AgentTypeBadge`, multi-line address, "View agent →" link. |
| `components/agents/agent-map-empty.tsx`         | Empty-state card "No mappable agents yet". |

### 5.3 Pin colours

| AgentType       | Colour    | Hex      |
|-----------------|-----------|----------|
| organization    | indigo    | `#4f46e5` |
| individual      | emerald   | `#059669` |
| virtual         | amber     | `#d97706` |

Implemented as three precomputed `L.divIcon` instances; clustering keeps the default markercluster colour bubbles.

### 5.4 Filters

Three controls in a flex row above the map:

- `AgentType` — existing `Select` (mirrors the agents list page filter).
- `Taxonomy` — `<TaxonomyTreeSelect>` (already in the codebase).
- `Country` — `<CountryCombobox>` from spec 006.

Filter state is **client-side**: we always fetch all agents once, then `.filter()` in memory before passing to the map. The list is bounded (admin tool, few thousand at most).

### 5.5 Click behaviour

Marker click → Leaflet `<Popup>`:

```
┌──────────────────────────────────┐
│ Acme Corp                        │
│ [Organization]                   │
│                                  │
│ ul. Marszałkowska 1              │
│ 00-001 Warszawa                  │
│ Poland                           │
│                                  │
│           View agent →           │
└──────────────────────────────────┘
```

### 5.6 Entry point

The agents list-page toolbar (`packages/ui/src/components/agents/agents-data-table.tsx`) gets a `Map` button placed in the `primaryActions` slot we introduced for the invoice page:

```tsx
<DataTableToolbar
  ...
  primaryActions={
    <Link href="/admin/agents/map">
      <Button variant="outline">
        <MapIcon className="mr-2 h-4 w-4" />
        {t('viewMap')}
      </Button>
    </Link>
  }
/>
```

No new sidebar entry (Q3.6).

### 5.7 Loading & empty states

- **Loading** — full-width grey skeleton rectangle (`<Skeleton className="h-[600px] w-full" />`).
- **Zero plottable agents** — empty-state card "No mappable agents yet" with a link back to `/admin/agents`.

### 5.8 i18n (new `agentsMap` namespace)

en + pl, under a new `"agentsMap"` block:

- `title` — "Agents map" / "Mapa agentów"
- `viewMap` — "Map" / "Mapa"
- `backToAgents` — "Back to agents" / "Powrót do agentów"
- `noMappable` — "No mappable agents yet" / "Brak agentów na mapie"
- `noMappableHint` — "Add a primary address with coordinates to plot an agent here." / "Dodaj adres główny z koordynatami…"
- `viewAgent` — "View agent" / "Zobacz agenta"
- `filterType` — "Type" / "Typ"
- `filterTaxonomy` — "Taxonomy" / "Taksonomia"
- `filterCountry` — "Country" / "Kraj"
- `allTypes` — "All types" / "Wszystkie typy"
- `allTaxonomies` — "All taxonomies" / "Wszystkie taksonomie"
- `allCountries` — "All countries" / "Wszystkie kraje"

## 6. Database

### 6.1 Migration `1700000000044-AddAddressLatLng.ts`

```sql
ALTER TABLE addresses
  ADD COLUMN "latitude"  numeric(10, 7),
  ADD COLUMN "longitude" numeric(10, 7);
```

Down: drop the two columns.

No backfill (Q2.5 override stands). Existing seeded addresses will be re-created via `pnpm seed:sample -- --reset` with hard-coded coords (per §11).

### 6.2 Referential integrity

Unchanged from spec 006. The new columns are scalar and nullable.

## 7. Permissions

Unchanged from spec 006: `AddressesService` lives behind `AgentsController @UseGuards(AdminGuard)`. The new `/admin/agents/map` page is admin-only (the web app's existing layout enforces this). No new guards.

## 8. Backend module layout

```
packages/core/src/
├── geocoding/                            (new)
│   ├── geocoding.module.ts
│   ├── geocoding.client.ts
│   └── index.ts
├── agents/
│   └── addresses/
│       └── addresses.service.ts          (extended: geocode-on-save + skipGeocode opt)
├── commands/
│   └── seeders/
│       └── agent.seeder.ts               (extended: pass {skipGeocode:true} + coords)
└── marketlum-core.module.ts              (imports + exports GeocodingModule)
```

Wire `GeocodingModule` into `AgentsModule.imports` so `AddressesService` can inject `GEOCODING_CLIENT`.

`packages/core/package.json` gains:

```
"@googlemaps/google-maps-services-js": "^3.4.0"
```

## 9. Shared package additions

`packages/shared/src/schemas/address.schema.ts` — extend `addressResponseSchema`:

```ts
latitude: z.string().nullable(),
longitude: z.string().nullable(),
```

`packages/shared/src/index.ts` — no new exports (the existing `addressResponseSchema` re-export already carries the new fields via inference).

## 10. UI package additions

`packages/ui/package.json` gains:

```
"leaflet": "^1.9.4",
"react-leaflet": "^4.2.1",
"leaflet.markercluster": "^1.5.3",
"@types/leaflet": "^1.9.12",
"@types/leaflet.markercluster": "^1.5.5"
```

Files: see §5.2.

`packages/ui/src/index.ts` — export `AgentsMapPage`.

Globals: import `leaflet/dist/leaflet.css` and `leaflet.markercluster/dist/MarkerCluster.css` / `MarkerCluster.Default.css` from `agents-map.css`.

## 11. Web app wiring

New page (template-sync required per `CLAUDE.md`):

- `apps/web/src/app/admin/agents/map/page.tsx` — one-liner:
  ```ts
  export { AgentsMapPage as default } from '@marketlum/ui';
  ```
- `packages/create-marketlum-app/template/web/src/app/admin/agents/map/page.tsx` — identical mirror.

Both must be added; the template-sync rule is non-negotiable.

## 12. Seed data

Per the user clarification on Q4.6: **no geocoder calls during seed**. The agent seeder is extended to:

1. Accept the explicit coords via `AddressesService.create(..., { skipGeocode: true, latitude, longitude })`.
2. Use the published lat/lng for the 5 existing seed addresses (hard-coded):

| Address                                     | latitude    | longitude  |
|---------------------------------------------|-------------|------------|
| Acme Corp — Warsaw HQ                       | 52.2296756  | 21.0122287 |
| Acme Corp — Berlin office                   | 52.5170365  | 13.3888599 |
| TechNova Solutions — San Francisco HQ       | 37.7886941  | -122.3939138 |
| GreenLeaf Partners — London HQ              | 51.5128396  | -0.1240489 |
| GreenLeaf Partners — Gdańsk Warehouse       | 54.3520252  | 18.6466384 |

Implementation: extend the seed-only address shape with `latitude / longitude` strings; pipe them through the `skipGeocode` opt path.

## 13. BDD test coverage

**None** (Q4.4 override).

Rationale captured in the brainstorm: the user opted out of strict BDD for this feature. Coverage relies on:

- TypeScript compile in `packages/core`, `packages/ui`, `apps/web`, `apps/api`.
- Manual smoke (§16).
- The existing spec-006 BDD remains intact and continues to cover the address CRUD surface; the new `latitude / longitude` fields are present in those responses as nullable strings.

## 14. `.env.example` & template sync

Add a commented entry to both:

- `.env.example` (repo root)
  ```
  # GOOGLE_MAPS_API_KEY=
  ```
- `packages/create-marketlum-app/template/_env.example.tmpl`
  ```
  # GOOGLE_MAPS_API_KEY=
  ```

Placed adjacent to the existing `# ANTHROPIC_API_KEY=` entry for consistency.

## 15. Out of scope

- **Backfill of pre-existing addresses** (Q2.5). Existing data won't appear on the map until each row is re-saved or the sample seed is re-run with coords.
- **Manual lat/lng override** (Q2.6). Coords are derived from Google's response only.
- **City- or country-centroid fallback** (Q1.6, Q1.1). Addresses without coords are hidden silently.
- **Side panel of unmapped agents** (Q1.6). Hidden silently.
- **Persistent / per-user viewport** (Q3.1). Always auto-fits on each visit.
- **Agent-name free-text search** (Q3.5). Three filter chips only.
- **Sidebar entry for the map** (Q3.6). Entry is the toolbar button on the agents list.
- **Spatial queries / PostGIS** (Q2.1, Q4.5). Plain numeric columns, no GIST index.
- **UI BDD / Playwright** (Q4.4).
- **Async geocoding queue** (Q1.4). Synchronous in the service layer.
- **Re-geocode-on-demand button** (Q2.4). Re-geocode happens only when a postal field changes.

## 16. Delivery plan (single PR per Q4.7)

Order of work:

1. **Schema migration** — `1700000000044-AddAddressLatLng.ts`; run `pnpm migration:run` locally; verify `\d addresses` shows the two new columns.
2. **Shared schema** — extend `addressResponseSchema`; build `@marketlum/shared`.
3. **Geocoding module** — `packages/core/src/geocoding/{module,client,index}.ts`; add `@googlemaps/google-maps-services-js` to `packages/core/package.json`; wire `GeocodingModule` into `AgentsModule.imports`.
4. **AddressesService extension** — inject `GEOCODING_CLIENT`; add the create/update geocode flow, the `skipGeocode` opt, and the field-diff check on update.
5. **Seed update** — extend agent seeder with the hard-coded coords table (§12); pass `{ skipGeocode: true, latitude, longitude }`.
6. **Manual seed verification** — `pnpm seed:sample -- --reset`; confirm `SELECT line1, latitude, longitude FROM addresses` returns five rows with non-null coords.
7. **`.env.example` + template** — commented `# GOOGLE_MAPS_API_KEY=` entries.
8. **UI package** — `package.json` deps; `agents-map-page.tsx`, `agents-map.tsx`, `agent-map-marker.tsx`, `agent-map-empty.tsx`, `agents-map.css`; `index.ts` export; `pnpm tsc --noEmit` in `packages/ui`.
9. **Entry button** — extend `agents-data-table.tsx` to pass a `Map` button via `primaryActions`; update i18n.
10. **Web app pages** — `apps/web/src/app/admin/agents/map/page.tsx` and its template mirror.
11. **Manual smoke** — `pnpm dev`, navigate to `/admin/agents/map`, verify five pins clustered correctly across PL/DE/US/GB, click a pin and confirm the popup + "View agent →" link works; resize the window and confirm clusters re-form; toggle filters.
12. **(Optional, only if `GOOGLE_MAPS_API_KEY` is set in `.env`)** — create a new address in the UI, confirm coords appear on the response and the new pin shows up on the map.
