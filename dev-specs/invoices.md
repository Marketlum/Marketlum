## Claude Code Spec — Invoices Module (Agents + File + Items referencing Value/ValueInstance)

### Goal

Implement an **Invoices** module to track invoices exchanged between Agents, with:

* `fromAgent` and `toAgent`
* invoice `number`
* `issuedAt`, `dueAt` dates
* optional `link`
* optional single uploaded `file` (using FileUpload entity)
* multiple **InvoiceItems**, each referencing either a **Value** or a **ValueInstance**, plus `quantity`

Includes:

* CRUD
* paginated list with search/filter/sort
* invoice detail view with items management

---

# 1) Data Model

## 1.1 Entity: `Invoice`

Fields:

* `id: UUID`

Parties:

* `fromAgentId: UUID` *(required; references Agent)*
* `toAgentId: UUID` *(required; references Agent)*

Core:

* `number: string` *(required, unique per fromAgent; recommended)*
* `issuedAt: date` *(required)*
* `dueAt: date` *(required)*

Optional:

* `link: string | null` *(optional URL)*
* `fileId: UUID | null` *(optional; references FileAsset from Files module)*
* `note: string | null` *(optional; max 2000 chars)*

Audit:

* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `fromAgentId != toAgentId` *(recommended, but allow if internal invoices exist)*
* `dueAt >= issuedAt`
* `number` unique within `(fromAgentId, number)`

---

## 1.2 Entity: `InvoiceItem`

Fields:

* `id: UUID`
* `invoiceId: UUID` *(required; references Invoice)*

Item reference (exactly one must be set):

* `valueId: UUID | null` *(references Value)*
* `valueInstanceId: UUID | null` *(references ValueInstance)*

Quantity:

* `quantity: number` *(required; must be > 0)*

Optional:

* `description: string | null` *(optional; max 500 chars)*

Audit:

* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* XOR rule: exactly one of `valueId` or `valueInstanceId` must be provided
* `quantity > 0`
* Prevent duplicates:

  * unique `(invoiceId, valueId)` where valueId not null
  * unique `(invoiceId, valueInstanceId)` where valueInstanceId not null

---

# 2) Backend API

## 2.1 Invoices

### List Invoices (paginated)

`GET /invoices`
Query params:

* `q` *(search by number, note)*
* `fromAgentId`
* `toAgentId`
* `issuedFrom`, `issuedTo`
* `dueFrom`, `dueTo`
* `hasFile` *(true/false)*
* `sort` *(default `issuedAt_desc`)*

  * `issuedAt_desc`
  * `dueAt_asc`
  * `number_asc`
  * `updatedAt_desc`
* `page`, `pageSize`

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "number": "FV/2026/01/001",
      "fromAgentId": "uuid",
      "toAgentId": "uuid",
      "issuedAt": "2026-01-10",
      "dueAt": "2026-01-24",
      "link": "https://...",
      "fileId": "uuid-or-null",
      "itemsCount": 3,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

### Get Invoice Details

`GET /invoices/:id`
Return:

* invoice fields
* fromAgent + toAgent (basic)
* file metadata (if exists)
* items[]

### Create Invoice

`POST /invoices`
Body:

```json
{
  "fromAgentId": "uuid",
  "toAgentId": "uuid",
  "number": "FV/2026/01/001",
  "issuedAt": "2026-01-10",
  "dueAt": "2026-01-24",
  "link": null,
  "fileId": null,
  "note": "January coaching services"
}
```

### Update Invoice

`PATCH /invoices/:id`
Editable:

* fromAgentId
* toAgentId
* number
* issuedAt
* dueAt
* link
* fileId
* note

Validation:

* dueAt >= issuedAt
* number uniqueness preserved

### Delete Invoice

`DELETE /invoices/:id`
Rules:

* allowed if invoice has no items OR delete cascades items
  MVP: allow delete and cascade delete items.

---

## 2.2 Invoice Items

### Add item

`POST /invoices/:id/items`
Body (Value-based):

```json
{
  "valueId": "uuid",
  "valueInstanceId": null,
  "quantity": 3,
  "description": "Coaching session"
}
```

Body (ValueInstance-based):

```json
{
  "valueId": null,
  "valueInstanceId": "uuid",
  "quantity": 1,
  "description": "Trademark registration PL-123"
}
```

Validation:

* XOR rule enforced

### Update item

`PATCH /invoices/:id/items/:itemId`
Editable:

* valueId / valueInstanceId (still XOR)
* quantity
* description

### Delete item

`DELETE /invoices/:id/items/:itemId`

---

## 2.3 File Attachment

Use Files module:

* upload/select file → get `fileId`
* attach by `PATCH /invoices/:id` with `fileId`

Validation:

* allow any file type (PDF most common)

---

## 2.4 Seed Data

`POST /invoices/seed`

Seed prerequisites:

* Agents exist: Marketlum, XYZ Inc.
* Values exist: “Coaching Session” (Service), “PLN” (Product)
* ValueInstances exist (optional)

Seed invoices:

1. FV/2026/01/001

* from: Marketlum → to: XYZ Inc.
* issuedAt: 2026-01-10
* dueAt: 2026-01-24
* items:

  * Value: Coaching Session, qty 6
  * Value: PLN, qty 1 (optional example)

2. FV/2026/01/002

* items reference ValueInstance (one item)

Idempotent.

---

# 3) Frontend Requirements (React)

## 3.1 Invoices List Page `/invoices`

Header:

* Title: `Invoices`
* Button: `+ New Invoice`
* Optional: `Seed sample data`

Filters row:

* Search by number
* From Agent dropdown
* To Agent dropdown
* Issued date range
* Due date range
* Sort dropdown

Table columns:

* Number
* From → To
* Issued At
* Due At
* Items count
* File indicator (paperclip icon)
* Updated At
* Actions (⋯)

Row click opens invoice details.

---

## 3.2 Invoice Detail Page `/invoices/:id`

Sections:

### Header

* Invoice number
* From Agent → To Agent
* Issued / Due dates
* Actions: Edit / Delete

### Metadata

* Link (clickable)
* File attachment:

  * Upload new
  * Choose from library
  * Preview/download

### Items

Items table:

* Reference type badge: `Value` or `ValueInstance`
* Reference name
* Quantity
* Description
* Actions: Edit/Delete

Add item form:

* Choose “Item type” toggle: Value / ValueInstance
* Dropdown selector for chosen type
* Quantity input
* Optional description
* Add button

---

# 4) Validation & UX Rules

* `dueAt` cannot be before `issuedAt`
* `quantity` must be > 0
* item must reference exactly one of Value or ValueInstance
* show inline errors on form

---

# 5) Testing Requirements

Backend:

* create invoice
* list pagination/filtering
* enforce dueAt >= issuedAt
* add items (value and valueInstance)
* enforce XOR rule
* delete invoice cascades items

Frontend:

* list renders + filters work
* create invoice works
* add/edit/delete items works
* attach file works

---

# 6) Acceptance Criteria

* User can CRUD invoices with from/to Agents, number, issuedAt, dueAt.
* Invoice supports optional link and single file upload.
* Invoice supports multiple items referencing either Value or ValueInstance with quantity.
* Invoices list is paginated, searchable, filterable, sortable.
* Invoice details page allows item management.

---

# Questions (to finalize)

1. invoice `number` must unique per `fromAgent`?
2. invoices have a `state` (draft/sent/paid/overdue)
3. For InvoiceItems: I want pricing fields now (unit price, total) 