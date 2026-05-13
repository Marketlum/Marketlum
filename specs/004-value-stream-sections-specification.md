# Value Stream Sections — Specification

> **Status:** Approved (brainstormed in `004-value-stream-sections-brainstorming.md`)
> **Target delivery:** Single PR &mdash; Agreement migration + schema/service, data-table embedded behaviour, header moved to layout, six new sub-route pages + tab strip update, BDD coverage, template sync.
> **Scope:** Split `/admin/value-streams/[id]` into focused sub-routes (Values, Offerings, Agreement Templates, Agreements, Exchanges, Recurring Flows) alongside the existing Overview and Budget tabs. Embed the existing data-table components scoped to the current value stream; auto-hide the &ldquo;Value Stream&rdquo; column and pre-fill the Create form. Add a nullable `valueStreamId` FK to `Agreement`.

---

## 1. Overview

```
/admin/value-streams/[id]/
├── layout.tsx                ← header (image, name, edit/delete) + tabs
├── page.tsx                  ← Overview (slim)
├── values/page.tsx
├── offerings/page.tsx
├── agreement-templates/page.tsx
├── agreements/page.tsx
├── exchanges/page.tsx
├── recurring-flows/page.tsx
└── budget/page.tsx           ← unchanged (spec 003)
```

Tab order (left to right):

```
Overview │ Values │ Offerings │ Agreement Templates │ Agreements │ Exchanges │ Recurring Flows │ Budget
```

On mobile, the tab strip collapses to a `Section ▾` dropdown.

---

## 2. Domain Model Change

### 2.1 `Agreement.valueStreamId`

A nullable FK on `Agreement` to `ValueStream(id)`. Mirrors the pattern on `Invoice`, `Offering`, `Exchange`, `Value`.

| Field | Type | Notes |
|---|---|---|
| `valueStreamId` | `uuid`, nullable | FK &rarr; `value_streams.id` `ON DELETE SET NULL`, `ON UPDATE NO ACTION`. Index on the column. |

Legacy rows keep `NULL`. Admins associate as they edit. No backfill (Q3.5).

### 2.2 Zod schemas

`packages/shared/src/schemas/agreement.schema.ts`:

- `createAgreementSchema` adds `valueStreamId: z.string().uuid().nullable().optional()`.
- `updateAgreementSchema` adds the same (already permissive).
- `agreementResponseSchema` adds `valueStream: valueStreamSummarySchema.nullable()`.
- Search query gains `valueStreamId: z.string().uuid().optional()` filter param.

### 2.3 Service

`AgreementsService` validates the FK on create/update (existing pattern from `Offering`); `search` accepts `valueStreamId` and adds `flow.valueStreamId = :valueStreamId` to the query builder; `findOne` adds `'valueStream'` to relations. The entity gets the `@ManyToOne` + `@Column({ type: 'uuid', nullable: true })` mappings.

### 2.4 Migration

Migration `RenameOrAddAgreementValueStream<NNNN>` (next number; presumably `1700000000042`):

```sql
ALTER TABLE "agreements" ADD COLUMN "valueStreamId" uuid;
ALTER TABLE "agreements"
  ADD CONSTRAINT "FK_agreements_value_stream"
  FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "IDX_agreements_value_stream" ON "agreements" ("valueStreamId");
```

`down()` drops index, FK, and column in reverse order. Add to `migrations/index.ts`.

---

## 3. Data-Table Embedded Contract

The existing components &mdash; `ValuesDataTable`, `OfferingsDataTable`, `AgreementsDataTable`, `AgreementTemplatesDataTable`, `ExchangesDataTable`, `RecurringFlowsDataTable` &mdash; already accept a `valueStreamId?: string` prop. They are tightened to also:

1. **Hide** the &ldquo;Value Stream&rdquo; column when `valueStreamId` is set. Implementation: `columnVisibility.valueStream = false` (or the equivalent for each table's column id).
2. **Prefill** the &ldquo;Create &lt;X&gt;&rdquo; form dialog with that `valueStreamId` and **disable** the Value Stream picker so users can't reassign during creation (Q3.1).
3. **Filter** the list query (already in place).

Each table's `Create <X>` form already accepts an `initialValueStreamId` or `defaultValueStreamId` prop &mdash; pass it through from the data-table. The pickers receive `disabled={Boolean(scopedValueStreamId)}`.

### 3.1 AgreementTemplates filter semantics

The query for the embedded `AgreementTemplatesDataTable` adds `valueStreamId IS NULL OR valueStreamId = :id` (Q1.4) so the tab shows both stream-specific and globally-available templates. Top-level `/admin/agreement-templates` keeps its strict filter when a stream is selected via its own filter chip.

Implementation choice: extend `agreementTemplatesService.search`'s `valueStreamId` filter to recognise a special value (or add a `includeGlobalTemplates` boolean). Recommended: add a query-level boolean &mdash; `valueStreamId` filters strictly, `valueStreamIdWithGlobals` filters with the OR.

Cleaner alternative: the embedded component issues two requests and merges, or uses a dedicated sub-route on the controller. We pick the **`valueStreamIdWithGlobals: boolean` query param** path because it keeps the existing strict filter intact for top-level usage.

---

## 4. Layout, Header, Tabs

### 4.1 `[id]/layout.tsx` (updated)

Replaces the simple tabs wrapper from spec 003 with:

1. **Header card** (moved from `page.tsx`): `FileImagePreview` of the stream's image, name, purpose, optional lead avatar/name, and Edit / Delete buttons.
2. **Tab strip** below the header.

The layout fetches the value stream once (server-side or client-side) and renders the header. Child sub-pages don't need to re-fetch.

### 4.2 Tab strip

Renders 8 tabs as anchor-styled links (no Radix tabs, just `<Link>` elements with `data-active` styling). Order from Q1.5:

| href                                                | label                  | active when                                    |
|-----------------------------------------------------|------------------------|------------------------------------------------|
| `/admin/value-streams/[id]`                         | Overview               | `pathname === '/admin/value-streams/[id]'`     |
| `/admin/value-streams/[id]/values`                  | Values                 | `pathname.startsWith('…/values')`              |
| `/admin/value-streams/[id]/offerings`               | Offerings              | `pathname.startsWith('…/offerings')`           |
| `/admin/value-streams/[id]/agreement-templates`     | Agreement Templates    | `pathname.startsWith('…/agreement-templates')` |
| `/admin/value-streams/[id]/agreements`              | Agreements             | `pathname.startsWith('…/agreements')`          |
| `/admin/value-streams/[id]/exchanges`               | Exchanges              | `pathname.startsWith('…/exchanges')`           |
| `/admin/value-streams/[id]/recurring-flows`         | Recurring Flows        | `pathname.startsWith('…/recurring-flows')`     |
| `/admin/value-streams/[id]/budget`                  | Budget                 | `pathname.startsWith('…/budget')`              |

### 4.3 Mobile dropdown

On viewports `< md`, the tab strip is hidden and a single `<Select>` appears with the same eight options. Selecting a value navigates via `router.push`. The select trigger reads `Section: <current label>`. (Q1.6.)

---

## 5. Sub-page contents

Each sub-page is a `@marketlum/ui` page component re-exported by a one-line `apps/web/src/app/admin/value-streams/[id]/<segment>/page.tsx`.

### 5.1 Values

```tsx
import { useParams } from 'next/navigation';
import { ValuesDataTable } from '../components/values/values-data-table';

export function ValueStreamValuesPage() {
  const { id } = useParams<{ id: string }>();
  return <ValuesDataTable valueStreamId={id} />;
}
```

Breadcrumb: `Home > Value Streams > <name> > Values`. (Header lives in layout.)

### 5.2 Offerings

Same shape with `OfferingsDataTable`.

### 5.3 Agreement Templates

Embed `AgreementTemplatesDataTable` with `valueStreamId={id}` **and** a new `includeGlobals` prop set to `true`. The table requests `?valueStreamIdWithGlobals=<id>` instead of `?valueStreamId=<id>`.

### 5.4 Agreements

Embed `AgreementsDataTable` with `valueStreamId={id}`. The data-table now hides the &ldquo;Value Stream&rdquo; column (after the migration adds the field).

### 5.5 Exchanges

Embed `ExchangesDataTable` with `valueStreamId={id}`.

### 5.6 Recurring Flows

Renders three stacked components (Q2.5):

```tsx
<>
  <RecurringFlowsSummaryCard valueStreamId={id} />
  <RecurringFlowsDataTable valueStreamId={id} />
  <RecurringFlowsProjection valueStreamId={id} />
</>
```

### 5.7 Overview (slimmed)

```tsx
<>
  {/* header is in layout */}
  <CountsRow valueStreamId={id} />
  <QuickActionsRow valueStreamId={id} />
  <RevenueExpensesCard valueStreamId={id} />
</>
```

Contents:

- **CountsRow**: small inline row showing `5 values · 3 offerings · 8 exchanges · 12 recurring flows`, each clickable to its tab. Data sourced from existing list endpoints with `limit=1` to fetch the `total` from `meta`.
- **QuickActionsRow**: three buttons &mdash; Create Value, Create Exchange, Create Recurring Flow &mdash; opening their respective dialogs prefilled with the current value stream.
- **RevenueExpensesCard**: the existing chart + date-range preset picker, unchanged from today's Overview.

The old recent-values list, recent-exchanges list, recurring-flows summary/table/projection all leave Overview.

---

## 6. Permissions

`AdminGuard` (unchanged). All endpoints touched in this spec already wear it.

---

## 7. Backend Module Layout

```
packages/core/src/agreements/
├── entities/agreement.entity.ts        ← + @ManyToOne ValueStream, @Column valueStreamId
├── agreements.service.ts               ← validate FK, search filter, findOne relation
├── agreements.controller.ts            ← (no new route; search query gains valueStreamId)
└── agreement.dto.ts                    ← unchanged (Zod-generated)

packages/core/src/agreement-templates/
└── agreement-templates.service.ts      ← + valueStreamIdWithGlobals filter branch
└── agreement-templates.controller.ts   ← + @ApiQuery valueStreamIdWithGlobals

packages/core/src/migrations/
└── 1700000000042-AddAgreementValueStream.ts   ← new
```

---

## 8. Shared Package Additions

- `agreement.schema.ts` &mdash; `valueStreamId` optional on create/update/search; `valueStream` summary in response.
- `agreement-template.schema.ts` (or query schema) &mdash; `valueStreamIdWithGlobals: z.string().uuid().optional()` filter.

---

## 9. UI Package Additions

```
packages/ui/src/
├── layouts/value-stream-layout.tsx                ← gains header + 8-tab strip + mobile dropdown
├── pages/admin/
│   ├── value-stream-detail-page.tsx               ← slimmed (CountsRow + QuickActionsRow + RevenueExpenses)
│   ├── value-stream-values-page.tsx               ← NEW
│   ├── value-stream-offerings-page.tsx            ← NEW
│   ├── value-stream-agreement-templates-page.tsx  ← NEW
│   ├── value-stream-agreements-page.tsx           ← NEW
│   ├── value-stream-exchanges-page.tsx            ← NEW
│   └── value-stream-recurring-flows-page.tsx      ← NEW
├── components/value-streams/
│   ├── value-stream-counts-row.tsx                ← NEW
│   └── value-stream-quick-actions-row.tsx         ← NEW
└── components/agreements/agreement-form-dialog.tsx ← + Value Stream picker
```

Each new page component is exported from `packages/ui/src/index.ts`.

### 9.1 Embedded behaviour changes (per Q2.1, Q3.1)

All six embeddable data-tables get a small uniform refactor:

1. When `valueStreamId` prop is set:
   - Set `columnVisibility[valueStreamColumnId] = false` in the table's initial state.
   - Pass `defaultValueStreamId={valueStreamId}` to the create dialog.
   - In the dialog, the Value Stream picker is rendered `disabled` when `defaultValueStreamId` is set.

Existing top-level pages don't pass `valueStreamId` so they retain today's behaviour.

### 9.2 i18n

Add to `packages/ui/messages/en.json` (mirror in `pl.json`) under a new `valueStreamSections` block:

```
"tabOverview" (already exists in valueStreamBudget)
"tabValues", "tabOfferings", "tabAgreementTemplates", "tabAgreements",
"tabExchanges", "tabRecurringFlows", "tabBudget"
"sectionLabel"   // mobile dropdown trigger
"countsRowLabel" // "{count} values" etc — uses message format
"createValue", "createExchange", "createRecurringFlow"
```

Reuse existing keys (`tabOverview`, `tabBudget`) from `valueStreamBudget`.

---

## 10. Web App + Template Sync

Each new web route is a one-line re-export. The template mirror at `packages/create-marketlum-app/template/web/src/app/admin/value-streams/[id]/...` gets identical files.

```
apps/web/src/app/admin/value-streams/[id]/
├── layout.tsx                             ← (already exists; updated)
├── page.tsx                               ← (already exists; rewritten content but same export)
├── values/page.tsx                        ← NEW
├── offerings/page.tsx                     ← NEW
├── agreement-templates/page.tsx           ← NEW
├── agreements/page.tsx                    ← NEW
├── exchanges/page.tsx                     ← NEW
├── recurring-flows/page.tsx               ← NEW
└── budget/page.tsx                        ← (already exists)
```

Mirror identically under `packages/create-marketlum-app/template/...`. Per `CLAUDE.md`, this is mandatory.

---

## 11. Seed Data

No new seed required. The agreement seeder (`agreement.seeder.ts`) is updated to set `valueStreamId` on ~70% of seeded agreements (round-robin across the seeded streams) so the new sub-page renders non-empty out of the box.

---

## 12. BDD Coverage

Strict-BDD per project rule.

### 12.1 `packages/bdd/features/agreements/` &mdash; 5 new scenarios

| Scenario | Verifies |
|---|---|
| Create agreement with valueStreamId | response carries `valueStream` summary |
| Update agreement to set valueStreamId | switch from NULL to a stream |
| Update agreement to clear valueStreamId | switch back to NULL |
| List agreements filtered by valueStreamId | only matching rows returned |
| Deleting the referenced value stream sets agreement.valueStreamId to NULL | FK behaviour |

Step definitions extend the existing `agreements.steps.ts` (no new feature dir).

### 12.2 Out of BDD scope

- Data-table column-hiding (presentational, verified via `tsc`/visual).
- Tab-strip routing (covered by spec 003's existing layout pattern, plus `next build`).
- Mobile dropdown behaviour (same).

Test-count delta: **+5** scenarios in the `agreements` namespace (already 31 &rarr; 36).

---

## 13. Out of Scope

Cross-referenced to the brainstorming questions.

- **M:N agreement&harr;value-stream relationship** (Q2.2, Q3.5) &mdash; single nullable FK only.
- **Backfill `valueStreamId` on existing agreements** (Q3.5) &mdash; legacy rows stay NULL.
- **Refactor of underlying data-table internals beyond the embedded prop&apos;s new effects** (Q3.5).
- **Browser-level smoke tests for the new sub-routes** (Q3.2) &mdash; per project's no-e2e-in-conversation memory.
- **Members / Leads sub-page** (Q3.6) &mdash; deferred.
- **Files sub-page** (Q3.6) &mdash; deferred (needs `File.valueStreamId` first).
- **Tensions sub-page** (Q3.6) &mdash; deferred (needs `Tension.valueStreamId` first).
- **Folding Recurring Flows back into Budget** &mdash; explicitly separated (Q2.5).

---

## 14. Delivery Plan

Single PR. Order within the diff:

1. **Shared** &mdash; `agreement.schema.ts` adds `valueStreamId`; `agreement-template.schema.ts` (or query schema) adds `valueStreamIdWithGlobals`. Rebuild shared.
2. **Migration** &mdash; `1700000000042-AddAgreementValueStream.ts` + register in `migrations/index.ts`.
3. **Backend** &mdash; `Agreement` entity gains FK + column; `AgreementsService.create/update/search/findOne` updates; `AgreementTemplatesService.search` gains the `valueStreamIdWithGlobals` branch.
4. **Seeder** &mdash; `agreement.seeder.ts` sets `valueStreamId` on most agreements.
5. **BDD** &mdash; 5 new agreements scenarios + step extensions.
6. **UI: layout** &mdash; move header into `[id]/layout.tsx`; update tab strip to 8 entries; add mobile dropdown.
7. **UI: data-tables** &mdash; tighten the 6 embeddable tables (hide stream column, prefill & disable picker on create).
8. **UI: new page components** &mdash; six per Q2.4; slim Overview to `CountsRow + QuickActionsRow + RevenueExpensesCard`.
9. **Web app** &mdash; add the six `apps/web/src/app/admin/value-streams/[id]/<segment>/page.tsx` files.
10. **Template mirror** &mdash; identical files under `packages/create-marketlum-app/template/`.
11. **Verify** &mdash; build shared/core/ui/api; `tsc --noEmit` web and api tests; bump `MEMORY.md` BDD count (+5 agreements).
