# Import Invoice from PDF — Specification

> **Status:** Approved (brainstormed in `005-import-invoice-pdf-brainstorming.md`)
> **Target delivery:** Single PR &mdash; Anthropic SDK + extraction service + `POST /invoices/import` + form prefill + Import button + template mirror.
> **Scope:** Admin uploads an invoice PDF, the backend calls the Claude API to extract structured fields, resolves names against existing `Agent` / `Value` records by exact-name match, and the existing `InvoiceFormDialog` opens pre-filled with the extracted data and warnings for any unmatched entities. The PDF is stored as a `File` and its id flows into the form so the admin gets the source attached for free.

---

## 1. Overview

```
Admin clicks "Import from PDF" on /admin/invoices
     │
     ▼  multipart upload (application/pdf)
POST /invoices/import
     │
     ├── 1. Validate mime / size (≤ 10 MB) + page count (≤ 50)
     ├── 2. Persist PDF as a File row              → fileId
     ├── 3. Call Claude (vision) with a strict prompt
     │       model = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7'
     ├── 4. Validate Claude's JSON against the extraction Zod schema
     ├── 5. Resolve { fromAgent, toAgent, currency, item.value } by
     │       case-insensitive trimmed exact-name match
     ├── 6. Compose warnings[] for every unmatched name
     └── 7. Return { fileId, extracted, warnings }
                            │
                            ▼
InvoiceFormDialog opens (create-mode, prefill prop set)
  - amber Alert banner with the warnings
  - unmatched pickers show extracted name as ghost text
  - admin reviews, edits, submits POST /invoices as usual
```

---

## 2. API Surface

### 2.1 `POST /invoices/import`

`AdminGuard` (mirrors existing invoice routes).

**Request:** `multipart/form-data` with a single `file` field (`application/pdf`, ≤ 10 MB, ≤ 50 pages).

**Response 201** (Zod-validated):

```ts
{
  fileId: string,                                        // uuid
  extracted: {
    number: string | null,
    issuedAt: string | null,                             // ISO date "YYYY-MM-DD"
    dueAt: string | null,
    fromAgent: { name: string, id: string | null },
    toAgent:   { name: string, id: string | null },
    currency:  { name: string, id: string | null },
    items: Array<{
      description: string,
      quantity: string,                                  // decimal(2)
      unitPrice: string,
      total: string,
      value: { name: string, id: string | null } | null, // null when valueName missing
    }>,
    notes: string | null,
  },
  warnings: string[],                                    // human-readable
}
```

**Error responses:**

| Status | Body | Trigger |
|---|---|---|
| 400 | `{ message: 'No file uploaded' }` | empty multipart |
| 413 | `{ message: 'PDF exceeds 10 MB' }` | file size > 10 MB |
| 415 | `{ message: 'Only application/pdf is supported' }` | wrong mimetype |
| 422 | `{ message: 'Couldn't parse PDF', rawText?: string }` | Claude returns invalid JSON / Zod fails |
| 422 | `{ message: 'PDF exceeds 50 pages' }` | page count > 50 |
| 502 | `{ message: 'Extraction service unavailable' }` | Anthropic API error |
| 500 | `{ message: 'ANTHROPIC_API_KEY not configured' }` | env var missing |

The PDF is **only persisted as a File on success**. On any failure path the in-memory buffer is discarded.

### 2.2 No new endpoints elsewhere

The form keeps using the existing `POST /invoices` for creation; only the prefill path is new.

---

## 3. Zod Schemas (shared package)

New file `packages/shared/src/schemas/invoice-import.schema.ts`:

```ts
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Shape Claude is instructed to return
export const claudeInvoiceExtractionSchema = z.object({
  number: z.string().nullable(),
  issuedAt: isoDate.nullable(),
  dueAt: isoDate.nullable(),
  fromAgent: z.object({ name: z.string() }),
  toAgent:   z.object({ name: z.string() }),
  currency:  z.object({ name: z.string() }),
  items: z.array(z.object({
    description: z.string(),
    valueName:   z.string().optional(),
    quantity:    decimalString,
    unitPrice:   decimalString,
    total:       decimalString,
  })),
  notes: z.string().nullable(),
});

// What the endpoint returns to the client
const namedRefSchema = z.object({
  name: z.string(),
  id: z.string().uuid().nullable(),
});

export const invoiceImportResponseSchema = z.object({
  fileId: z.string().uuid(),
  extracted: z.object({
    number: z.string().nullable(),
    issuedAt: z.string().nullable(),
    dueAt: z.string().nullable(),
    fromAgent: namedRefSchema,
    toAgent:   namedRefSchema,
    currency:  namedRefSchema,
    items: z.array(z.object({
      description: z.string(),
      quantity: z.string(),
      unitPrice: z.string(),
      total: z.string(),
      value: namedRefSchema.nullable(),
    })),
    notes: z.string().nullable(),
  }),
  warnings: z.array(z.string()),
});

export type ClaudeInvoiceExtraction = z.infer<typeof claudeInvoiceExtractionSchema>;
export type InvoiceImportResponse = z.infer<typeof invoiceImportResponseSchema>;
```

Re-exported from `packages/shared/src/index.ts`.

---

## 4. Backend Module Layout

```
packages/core/src/invoices/
├── invoices.controller.ts            ← + @Post('import') route
├── invoices.module.ts                ← + InvoiceImportService, AnthropicClient provider
├── invoices.service.ts               ← unchanged
├── invoice-import.service.ts         ← NEW
└── anthropic.client.ts               ← NEW: AnthropicClient interface + Anthropic SDK impl
```

### 4.1 `AnthropicClient` interface

```ts
export interface AnthropicClient {
  extractInvoice(pdfBuffer: Buffer): Promise<ClaudeInvoiceExtraction>;
}

export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');
```

Production binding (provided in `InvoicesModule`):

```ts
{
  provide: ANTHROPIC_CLIENT,
  useFactory: () => new RealAnthropicClient(),
}
```

`RealAnthropicClient` wraps the `@anthropic-ai/sdk` v0.x client. It reads `ANTHROPIC_API_KEY` (throws at first use if missing), reads `ANTHROPIC_MODEL` (defaults to `'claude-opus-4-7'`), encodes the PDF as a base64 `document` content block, prompts with a system message instructing strict JSON output, calls `messages.create`, and `JSON.parse`s the assistant&apos;s reply. Validation happens *outside* this client (in `InvoiceImportService`) so the client stays a thin SDK wrapper.

### 4.2 `InvoiceImportService`

Constructor injects: `ANTHROPIC_CLIENT`, `FilesService`, `AgentRepository`, `ValueRepository` (currency lookup uses the existing `Value` repo).

Public method:

```ts
async import(pdfBuffer: Buffer, mimetype: string, filename: string, sizeBytes: number)
  : Promise<InvoiceImportResponse>;
```

Steps:

1. **Gate**: throw `UnsupportedMediaTypeException` if `mimetype !== 'application/pdf'`; `PayloadTooLargeException` if `size > 10 MB`. Page count check (Q2.6 / Q2.7): use `pdf-lib` (light dep) to read page count; `UnprocessableEntityException` if `> 50`.
2. **Extract**: `extraction = await anthropic.extractInvoice(buffer)`; on SDK error throw `BadGatewayException`. On `JSON.parse` failure throw `UnprocessableEntityException` with `rawText` of the assistant&apos;s reply.
3. **Validate**: `claudeInvoiceExtractionSchema.parse(extraction)` — on failure throw `UnprocessableEntityException` with `rawText`.
4. **Persist PDF**: `fileId = await filesService.uploadBuffer(buffer, filename, mimetype)`. Done only after successful extraction so failed imports don&apos;t leave orphan files.
5. **Resolve names**: case-insensitive trimmed exact-name lookups:
   - `fromAgent.id` ← `Agent.findOne({ where: ILike(name) })`
   - `toAgent.id`   ← same
   - `currency.id`  ← `Value.findOne({ where: ILike(name) })`
   - For each item, if `valueName` present: `Value.findOne({ where: ILike(valueName) })`; else `value = null`.
6. **Compose warnings**: push a string for every unmatched name plus a single summary string when any items lack a `value` match (&ldquo;3 items without a matching Value&rdquo;).
7. **Log usage**: log `{ inputTokens, outputTokens, model, costCents }` to the API logger. Cost is computed from the published per-Mtok rates for the configured model.
8. **Return** the assembled `InvoiceImportResponse`.

### 4.3 Controller route

```ts
@Post('import')
@HttpCode(HttpStatus.CREATED)
@UseInterceptors(FileInterceptor('file'))
@ApiOperation({ summary: 'Extract invoice fields from a PDF and stage them for create' })
@ApiOkResponse({ type: InvoiceImportResponseDto })
async import(
  @UploadedFile(
    new ParseFilePipe({
      validators: [new FileTypeValidator({ fileType: 'application/pdf' })],
    }),
  )
  file: Express.Multer.File,
) {
  return this.invoiceImportService.import(
    file.buffer,
    file.mimetype,
    file.originalname,
    file.size,
  );
}
```

DTO: `InvoiceImportResponseDto` extends `createZodDto(invoiceImportResponseSchema)`.

---

## 5. Permissions

`AdminGuard` at the controller level (unchanged). No per-admin rate limit in v1 (Q3.8).

---

## 6. Environment Variables

Add to README + `.env.example.tmpl`:

- `ANTHROPIC_API_KEY` (required for the import endpoint; if absent the endpoint returns 500 with a clear error).
- `ANTHROPIC_MODEL` (optional, default `claude-opus-4-7`).

The import service reads these at request time (not at module init) so the rest of the API still boots without the key.

---

## 7. Prompt Design

System prompt (set on the `messages.create` call):

```
You are an invoice extraction service. Given a PDF invoice, return a single JSON
object that EXACTLY matches this TypeScript shape. Do NOT include markdown, prose,
or any text outside the JSON.

{
  "number": string | null,                  // invoice number / id
  "issuedAt": string | null,                // ISO date "YYYY-MM-DD"
  "dueAt": string | null,                   // ISO date "YYYY-MM-DD"
  "fromAgent": { "name": string },          // seller / issuer
  "toAgent":   { "name": string },          // buyer / recipient
  "currency":  { "name": string },          // ISO code (USD, EUR, …) or full name
  "items": Array<{
    "description": string,
    "valueName": string | undefined,        // optional — if a SKU/product name is present
    "quantity":  string,                    // decimal, up to 2 fractional digits
    "unitPrice": string,
    "total":     string
  }>,
  "notes": string | null
}

Rules:
- If you cannot find a field, use null (or omit "valueName" for items).
- All money amounts: decimal strings, 2 dp, no thousands separators.
- All dates: ISO "YYYY-MM-DD". Convert from any other format you see.
- Use the currency symbol/code as it appears on the invoice (e.g. "USD" not "$").
- Output ONLY the JSON. No commentary, no markdown fences.
```

User message content: a single `document` content block containing the base64-encoded PDF.

---

## 8. UI / UX

### 8.1 Import button

`packages/ui/src/components/invoices/invoices-data-table.tsx` gains an **Import from PDF** button next to the existing **Create Invoice** button. Clicking it:

1. Opens an invisible `<input type="file" accept="application/pdf" />` programmatically.
2. On file selection, opens an `ImportInvoiceDialog` modal showing a spinner + label "Extracting invoice…" + Cancel button (Q3.3).
3. POSTs the file as `multipart/form-data` to `/invoices/import` using a new `api.upload` flow (the existing `api.upload` already supports FormData; reuse it).
4. On success: close the spinner modal and open `InvoiceFormDialog` with `prefill={{ extracted, warnings, fileId }}`.
5. On 4xx / 5xx: close the spinner modal and toast a translated error message; on 422 with `rawText`, also offer a "Use raw text" affordance that copies the raw text to the clipboard for debugging.
6. Cancel button aborts the in-flight `fetch` (uses `AbortController`).

### 8.2 `InvoiceFormDialog` updates

New optional prop:

```ts
interface InvoiceFormDialogProps {
  // existing props…
  prefill?: InvoiceImportResponse;  // when set, dialog opens in create-mode with seeded fields + warnings
}
```

Behaviour when `prefill` is present (Q3.1):

- Dialog opens in *create* mode.
- Form state is initialized from `prefill.extracted` (fields, items, fileId).
- Pickers (`fromAgent`, `toAgent`, `currency`, per-item `value`):
  - If `id` resolved &rarr; the picker selects that option.
  - If `id` is `null` &rarr; the picker stays *unset*, but renders the extracted `name` as **ghost text** (placeholder/value text) plus an inline amber hint underneath: *&ldquo;Couldn&apos;t find &lsquo;{name}&rsquo; &mdash; pick one or create it.&rdquo;* (Q3.2).
- A dismissable amber `Alert` banner sits at the top of the form listing every entry in `warnings[]` (Q3.4).
- All field values remain fully editable.
- On submit: existing `POST /invoices` flow; `fileId` is included.

### 8.3 i18n

New keys under `invoices`:

```
"importFromPdf": "Import from PDF",
"importExtracting": "Extracting invoice…",
"importCancel": "Cancel",
"importFailedTitle": "Couldn't parse the PDF",
"importFailedBody": "The PDF couldn't be read. Try again or fill the form manually.",
"importOversize": "PDF exceeds 10 MB",
"importTooManyPages": "PDF exceeds 50 pages",
"importWrongType": "Only PDF files are supported",
"importUnconfigured": "PDF import is not configured (missing ANTHROPIC_API_KEY)",
"importWarningsTitle": "Some fields need your attention",
"importUnmatchedHint": "Couldn't find '{name}' — pick one or create it.",
"importUnmatchedItemsCount": "{count, plural, one {# item without a matching Value} other {# items without a matching Value}}"
```

Mirrored under `pl.json` with translated strings.

### 8.4 Modal-spinner component

`packages/ui/src/components/invoices/import-invoice-dialog.tsx`:

- A `Dialog` that cannot be closed except via the Cancel button.
- Inner: `<Loader2 className="animate-spin" />` + `t('importExtracting')`.
- `<Button variant="outline" onClick={cancel}>{t('importCancel')}</Button>`.
- Cancel calls `abortController.abort()` on the parent-supplied callback.

### 8.5 Pages affected

Only `invoices-data-table.tsx` and `invoice-form-dialog.tsx` are touched in the UI layer. The detail page (`invoice-detail-page.tsx`) is unaffected.

---

## 9. UI Package Additions

```
packages/ui/src/components/invoices/
├── import-invoice-dialog.tsx        ← NEW (spinner + cancel)
├── invoices-data-table.tsx          ← + Import button, abort handling, prefill plumbing
└── invoice-form-dialog.tsx          ← + prefill prop, warnings banner, ghost-text rendering
```

No new top-level page exports.

---

## 10. Web App + Template Sync

The new behaviour lives entirely inside existing `InvoicesPage` and its components, which are already mirrored under `packages/create-marketlum-app/template/web/src/app/admin/invoices/`. No new route files.

The `.env.example.tmpl` mirror gains the two new env-var documentation lines (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`).

---

## 11. Dependencies

New deps:

- `@anthropic-ai/sdk` &mdash; latest 0.x; added to `packages/core/package.json` as `dependencies`.
- `pdf-lib` &mdash; for page-count check; added to `packages/core/package.json` as `dependencies` (lightweight, no native binaries).

No new dev deps.

---

## 12. Seed Data

No seed changes.

---

## 13. BDD Test Coverage

Per **Q3.5**, no new BDD scenarios in v1. Manual smoke test plan:

1. Set `ANTHROPIC_API_KEY` locally; `pnpm dev`.
2. Visit `/admin/invoices`, click **Import from PDF**, pick a sample invoice.
3. Confirm the spinner appears, the form opens pre-filled, warnings show for unmatched entities.
4. Confirm submitting the form creates the invoice with the `fileId` attached.
5. Negative cases: upload a `.png`, an oversized PDF, a 60-page PDF &mdash; confirm the toast messages match Q2.5 / Q2.6.
6. Unset the env var, restart, confirm the import endpoint returns 500 with the "not configured" message.

The DI-injected `AnthropicClient` interface (Q3.6) is still in place so future unit tests can swap in a `FakeAnthropicClient`; v1 just doesn&apos;t add any.

---

## 14. Out of Scope

Cross-referenced to the brainstorming questions that defined each boundary.

- **PDF preview pane next to the form** (Q1.6) &mdash; the prefilled form is the review.
- **Auto-creation of agents / values** from extracted names (Q1.4, Q3.2) &mdash; admin picks or creates manually.
- **Per-field confidence display** (Q2.3) &mdash; deferred.
- **Retry on bad JSON** (Q2.5) &mdash; first-attempt 422.
- **Accept image MIME types** for scanned invoices (Q2.6) &mdash; PDF only.
- **Per-admin daily rate limit** (Q2.7, Q3.8) &mdash; deliberate non-decision; not blocking; ANTHROPIC_API_KEY is server-side anyway.
- **BDD coverage of the extraction path** (Q3.5) &mdash; manual smoke only in v1.
- **&ldquo;Create&lt;X&gt;&rdquo; quick-action buttons next to unmatched pickers** (Q3.2) &mdash; deferred.

---

## 15. Delivery Plan

Single PR. Order of work within the diff:

1. **Shared** &mdash; `invoice-import.schema.ts` + index re-exports. `pnpm --filter @marketlum/shared build`.
2. **Deps** &mdash; add `@anthropic-ai/sdk` and `pdf-lib` to `packages/core/package.json`; `pnpm install`.
3. **Anthropic client** &mdash; `anthropic.client.ts` with the interface, symbol, and `RealAnthropicClient` (handles env reads, base64 encoding, Messages API call, returns parsed JSON).
4. **Service** &mdash; `invoice-import.service.ts` implementing the 8-step flow in §4.2.
5. **Controller + DTO** &mdash; `Post('import')` on `InvoicesController` with multer + `ParseFilePipe`; new DTO from the shared response schema.
6. **Module wiring** &mdash; register service, `ANTHROPIC_CLIENT` factory, import `FilesModule` if not already present.
7. **UI** &mdash; new `import-invoice-dialog.tsx` (spinner modal); extend `invoices-data-table.tsx` with Import button + file picker + abort logic; extend `invoice-form-dialog.tsx` with the `prefill` prop + warnings banner + ghost-text rendering.
8. **i18n** &mdash; new keys in en/pl.
9. **Env docs** &mdash; README section + `.env.example.tmpl` lines (root + template).
10. **Verify** &mdash; `pnpm -r --filter '!@marketlum/web' build`; `tsc --noEmit` for web and api tests; manual smoke per §13. No `MEMORY.md` test-count change.
