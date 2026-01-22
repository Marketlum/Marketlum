## Claude Code Spec — Offerings Module (CRUD + State Machine + Items + Files + Paginated UI)

### Goal

Implement an **Offerings** module to manage market propositions (“Offerings”) that can be published, archived, and composed of multiple items referencing Value.
Users can:

* Create and manage Offerings
* Attach multiple files
* Assign Offering to an Agent and Value Stream
* Manage Offering items (Value + quantity + optional pricing metadata)
* Control lifecycle via a **state machine** (`draft → live → archived`)
* Browse Offerings via a **nice paginated list** with search, filters, and sorting

---

# 1) Data Model

## 1.1 Entity: `Offering`

Fields:

* `id: UUID`
* `valueStreamId: UUID` *(required; references ValueStream)*
* `agentId: UUID` *(required; references Agent)*
* `name: string` *(required, 2–200 chars)*
* `description: string | null` *(optional, max 2000 chars)*
* `purpose: string | null` *(optional, max 500 chars)*
* `link: string | null` *(optional URL)*
* `state: OfferingState` *(required; default `draft`)*
* `activeFrom: datetime | null` *(optional)*
* `activeUntil: datetime | null` *(optional)*
* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `activeUntil >= activeFrom` if both set
* `name` unique within `(agentId, valueStreamId)` (recommended)

---

## 1.2 Enum: `OfferingState`

* `draft`
* `live`
* `archived`

---

## 1.3 State Machine Rules

Allowed transitions:

### `draft`

* → `live`
* → `archived`

### `live`

* → `archived`
* (optional) → `draft` **NOT allowed** (recommended)

### `archived`

* no transitions (terminal)
* (optional) allow → `draft` only via admin “restore” (not MVP)

Validation:

* Transition requests must be explicit (via endpoint)
* Invalid transitions return `409 Conflict`

Additional rules:

* When moving to `live`:

  * if `activeFrom` is null, set to `now`
  * if `activeUntil` exists and is in the past, reject

---

## 1.4 Entity: `OfferingItem`

Fields:

* `id: UUID`
* `offeringId: UUID` *(required)*
* `valueId: UUID` *(required; references Value)*
* `quantity: number` *(required; default 1; must be > 0)*
* `pricingFormula: string | null` *(optional; max 500 chars)*
* `pricingLink: string | null` *(optional URL)*
* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `quantity > 0`
* `valueId` unique per `offeringId` (recommended to prevent duplicates)

---

## 1.5 Many-to-Many: Offering ↔ Files

### Entity: `OfferingFile`

Fields:

* `offeringId: UUID`
* `fileId: UUID`
* `createdAt: datetime`

Rules:

* An Offering can have multiple files attached
* Same file cannot be attached twice to the same offering (unique constraint)

---

# 2) Backend API

## 2.1 Offerings

### List Offerings (paginated)

`GET /offerings`
Query params:

* `q` *(search in name/description/purpose)*
* `state` *(draft|live|archived)*
* `agentId`
* `valueStreamId`
* `active` *(true/false)*

  * active=true means: `state=live` AND (`activeFrom` <= now) AND (`activeUntil` is null OR >= now)
* `sort` (default `updatedAt_desc`)

  * `updatedAt_desc`
  * `createdAt_desc`
  * `name_asc`
  * `state_asc`
  * `activeUntil_asc`
* `page`, `pageSize`

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Marketlum Coaching Package",
      "state": "live",
      "agentId": "uuid",
      "valueStreamId": "uuid",
      "description": "...",
      "purpose": "...",
      "link": "https://...",
      "activeFrom": "2026-01-01T00:00:00Z",
      "activeUntil": null,
      "itemsCount": 3,
      "filesCount": 2,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 123,
  "page": 1,
  "pageSize": 20
}
```

### Get Offering Details

`GET /offerings/:id`
Return:

* Offering
* items[]
* attached files metadata

### Create Offering

`POST /offerings`
Body:

```json
{
  "valueStreamId": "uuid",
  "agentId": "uuid",
  "name": "Marketlum Coaching for XYZ Inc.",
  "description": "3-month engagement...",
  "purpose": "Transform team into entrepreneurs",
  "link": "https://marketlum.com/offering/xyz",
  "activeFrom": null,
  "activeUntil": null
}
```

Default state: `draft`

### Update Offering

`PATCH /offerings/:id`
Editable fields:

* `valueStreamId`
* `agentId`
* `name`
* `description`
* `purpose`
* `link`
* `activeFrom`
* `activeUntil`

State cannot be set directly here (must use transition endpoint).

### Delete Offering

`DELETE /offerings/:id`
Rules:

* Allowed only if `state=draft` (recommended)
* Otherwise return `409 Conflict` `"Only draft offerings can be deleted."`

---

## 2.2 State Transitions

### Transition Offering State

`POST /offerings/:id/transition`
Body:

```json
{ "to": "live" }
```

Rules:

* Validate allowed transitions
* If to=live:

  * ensure at least 1 OfferingItem exists (recommended)
  * ensure activeUntil not in past
  * set activeFrom to now if null

Response:

```json
{ "id": "...", "state": "live" }
```

---

## 2.3 Offering Items

### Add item

`POST /offerings/:id/items`
Body:

```json
{
  "valueId": "uuid",
  "quantity": 3,
  "pricingFormula": "€2000 / month",
  "pricingLink": "https://..."
}
```

### Update item

`PATCH /offerings/:id/items/:itemId`
Body: any of:

* `quantity`
* `pricingFormula`
* `pricingLink`

### Delete item

`DELETE /offerings/:id/items/:itemId`

---

## 2.4 Offering Files

### Attach file

`POST /offerings/:id/files`
Body:

```json
{ "fileId": "uuid" }
```

### Remove file

`DELETE /offerings/:id/files/:fileId`

Files must exist in the Files module.

---

## 2.5 Seed Data

`POST /offerings/seed`

Seed must include:

* 2 Agents
* 2 Value Streams
* 4 Values
* 3 Offerings with mixed states and items
* some attached files (if available)

Example seed offerings:

1. **Marketlum Coaching — XYZ Inc.**

* state: `live`
* activeFrom: last week
* items:

  * Value: “Coaching Session” qty 6, formula “€500 / session”
  * Value: “Support Slack Access” qty 1

2. **Marketlum Framework License**

* state: `draft`
* items:

  * Value: “License” qty 1, link to pricing page

3. **Workshop: Build Your Market Map**

* state: `archived`
* activeUntil: last year

Idempotent seeding (no duplicates).

---

# 3) Validation Rules

## Offering

* name required, trimmed
* link optional URL
* activeFrom/activeUntil must be valid ISO datetimes
* activeUntil >= activeFrom
* must reference existing Agent and ValueStream

## OfferingItem

* quantity must be > 0
* pricingLink must be URL if provided
* value must exist

---

# 4) Frontend Requirements (React, “Nice UI”)

## 4.1 Offerings List Page `/offerings`

### Top Bar

* Title: `Offerings`
* Primary button: `+ New Offering`
* Secondary: `Load sample data`

### Search + Filters Row

* Search input: “Search offerings…”
* Filters:

  * State: All / Draft / Live / Archived
  * Value Stream: dropdown
  * Agent: dropdown
  * Active now: toggle (live + within date window)
* Sort dropdown:

  * Updated (newest)
  * Created (newest)
  * Name (A–Z)
  * Active until (soonest)
* Pagination:

  * 10 / 20 / 50 per page

### Table Columns

* Name (primary)
* State badge
* Agent
* Value Stream
* Active window (activeFrom → activeUntil)
* Items count
* Files count
* Updated
* Actions (⋯ menu)

Row click opens Offering details.

Actions menu:

* View
* Edit
* Go live (if draft)
* Archive (if live/draft)
* Delete (draft only)

---

## 4.2 Offering Details Page `/offerings/:id`

Sections:

1. Header with:

   * Name
   * State badge
   * Agent + Value Stream
   * Buttons: Edit / Transition state

2. Metadata card:

   * Purpose
   * Description
   * Link (clickable)
   * Active window
   * Created/Updated

3. Offering Items table:

   * Value (name + type)
   * Quantity
   * Pricing formula
   * Pricing link
   * Actions: edit/delete
   * Add item inline

4. Attached files:

   * Grid/list of file chips/cards
   * Attach from media library
   * Upload new file
   * Remove file

---

## 4.3 Create/Edit Offering Form

Fields:

* Value Stream (select)
* Agent (select)
* Name
* Purpose
* Description (textarea)
* Link
* Active From (datetime)
* Active Until (datetime)

After creating:

* redirect to details page to add items/files

---

# 5) UX Rules (State Machine in UI)

### Draft

* editable fully
* can add/remove items
* can attach/remove files
* can “Go live”
* can delete

### Live

* can edit description/purpose/link/activeUntil (allowed)
* cannot delete
* can archive

### Archived

* read-only by default
* cannot add items/files
* cannot transition further (MVP)

---

# 6) Testing Requirements

## Backend

* create offering defaults to draft
* transition draft → live works
* transition live → draft fails
* archived is terminal
* active window validation works
* items CRUD works
* attach/remove file works
* list filtering + pagination works

## Frontend

* list renders with filters/search/sort/pagination
* state transition buttons show correctly
* adding items updates items count
* attaching files updates files count

---

# 7) Acceptance Criteria

* Offerings CRUD works.
* Offerings support state machine transitions: draft → live → archived.
* Offerings have Agent + ValueStream references.
* Offerings can contain multiple items (Value + quantity + pricing metadata).
* Offerings support multiple attached files.
* Offerings list is paginated with search, filters, and sorting.
* UI clearly communicates state and allowed actions.

---

# Additional remarks

1. **live offerings** should be editable for items/pricing
2. `activeFrom/activeUntil` automatically control visibility (e.g. “scheduled live”)