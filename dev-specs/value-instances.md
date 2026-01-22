## Claude Code Spec — ValueInstances Module (Hierarchical + Agent→Agent + Versioning + Visibility)

### Goal

Implement a **ValueInstances** module to track concrete occurrences of Value in the market, e.g.:

* a specific product instance (e.g. “iPhone 15 Pro #SN123”)
* a specific service delivery (e.g. “Coaching Session #12 for XYZ”)
* a specific right (e.g. “Trademark registration #PL-…”)
* a specific relationship instance (e.g. “Partnership with ACME”)

Each **ValueInstance**:

* references a **Value**
* has **name**, **purpose**
* has a **direction** and moves **from Agent → to Agent**
* has a **version**
* has optional **link** and optional **image** (FileUpload)
* has **visibility** (`public` / `private`)
* is **hierarchical** (parent → children)

---

# 1) Data Model

## 1.1 Entity: `ValueInstance`

Fields:

* `id: UUID`

Core:

* `valueId: UUID` *(required; references Value)*
* `name: string` *(required, 2–200 chars)*
* `purpose: string | null` *(optional, max 500 chars)*
* `version: string` *(required; default `"1.0"`)*

Direction & Parties:

* `direction: ValueInstanceDirection` *(required)*
* `fromAgentId: UUID | null` *(optional; see rules)*
* `toAgentId: UUID | null` *(optional; see rules)*

Hierarchy:

* `parentId: UUID | null` *(optional; null = root instance)*
* `childrenCount: number` *(optional derived)*

Optional metadata:

* `link: string | null` *(optional URL)*
* `imageFileId: UUID | null` *(optional; references FileUpload)*

Visibility:

* `visibility: ValueInstanceVisibility` *(required; default `private`)*

Audit:

* `createdAt: datetime`
* `updatedAt: datetime`

---

## 1.2 Enum: `ValueInstanceVisibility`

* `public`
* `private`

---

## 1.3 Enum: `ValueInstanceDirection`

Defines semantic direction of the instance:

* `incoming` *(to us / received by stewarding org)*
* `outgoing` *(from us / delivered to others)*
* `internal` *(within the same organization/market)*
* `neutral` *(direction not relevant)*

> Note: You still store `fromAgentId` and `toAgentId`.
> `direction` is a UX/meaning layer for filtering and reporting.

---

# 2) Business Rules & Validation

## 2.1 Required fields

* `valueId`
* `name`
* `direction`
* `version`
* `visibility`

## 2.2 Agent direction rules

You have two possible strictness levels:

### MVP (recommended)

* `fromAgentId` optional
* `toAgentId` optional
  But at least one must be set:
* require `(fromAgentId != null) OR (toAgentId != null)`

### Strict mode (later)

* require both from and to for all instances

---

## 2.3 Hierarchy rules

* Prevent cycles:

  * cannot set parentId to self
  * cannot set parentId to descendant
* Child inherits visibility by default (optional UX rule)

  * if parent is `private`, child defaults to `private`

---

## 2.4 Versioning rules

* `version` is a string (e.g. `"1.0"`, `"2026-01"`, `"v2"`)
* Optional constraint: unique per `(valueId, name, version)` (recommended)
* Optional feature: increment version button (later)

---

## 2.5 Link & image validation

* `link` must be a valid http/https URL if present
* `imageFileId` must reference an image file (`image/*` mimeType)

---

# 3) Backend API

## 3.1 List ValueInstances (paginated)

`GET /value-instances`
Query params:

* `q` *(search name/purpose)*
* `valueId`
* `fromAgentId`
* `toAgentId`
* `direction`
* `visibility` *(public/private)*
* `parentId` *(for browsing a subtree)*
* `sort` *(default `updatedAt_desc`)*

  * `updatedAt_desc`
  * `createdAt_desc`
  * `name_asc`
  * `version_desc`
* `page`, `pageSize`

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "valueId": "uuid",
      "name": "Coaching Session #12",
      "purpose": "Support leadership team",
      "direction": "outgoing",
      "fromAgentId": "uuid-marketlum",
      "toAgentId": "uuid-xyz",
      "version": "1.0",
      "link": null,
      "imageFileId": null,
      "visibility": "private",
      "parentId": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 123
}
```

---

## 3.2 Get tree (hierarchical)

`GET /value-instances/tree`
Query params:

* `valueId` (optional)
* `visibility` (optional)

Returns nested structure:

```json
[
  {
    "id": "...",
    "name": "...",
    "children": [
      { "id": "...", "name": "...", "children": [] }
    ]
  }
]
```

---

## 3.3 Get details

`GET /value-instances/:id`
Return instance + children (optional) + value + agents + image metadata.

---

## 3.4 Create

`POST /value-instances`
Body:

```json
{
  "valueId": "uuid",
  "name": "Trademark #PL-123",
  "purpose": "Protect Marketlum brand",
  "direction": "neutral",
  "fromAgentId": "uuid-marketlum",
  "toAgentId": null,
  "version": "1.0",
  "link": "https://...",
  "imageFileId": "uuid-or-null",
  "visibility": "private",
  "parentId": null
}
```

---

## 3.5 Update

`PATCH /value-instances/:id`
Editable:

* valueId (optional; recommended to disallow if children exist)
* name
* purpose
* direction
* fromAgentId / toAgentId
* version
* link
* imageFileId
* visibility
* parentId

---

## 3.6 Delete

`DELETE /value-instances/:id`
Rules:

* Block delete if has children: `409 Conflict`

  * `"Cannot delete ValueInstance with children."`

---

## 3.7 Attach/Remove image

If Files module exists:

* upload/select image file first
* then update instance via `PATCH` with `imageFileId`

---

## 3.8 Seed Data

`POST /value-instances/seed`

Seed should include:

* Agents: Marketlum, XYZ Inc., Jane Doe
* Values: Product “PLN”, Service “Coaching”, Right “Trademark”, Relationship “Partnership”

Seed instances:

1. Root: “Coaching engagement — XYZ Inc.”

* value: Coaching
* direction: outgoing
* from: Marketlum → to: XYZ Inc.
* children:

  * “Coaching Session #1”
  * “Coaching Session #2”

2. Root: “Marketlum Trademark Registration”

* value: Trademark
* direction: neutral
* from: Marketlum
* child: “Trademark Renewal 2026”

3. Root: “Partnership — Jane Doe”

* value: Partnership
* direction: neutral
* from: Marketlum → to: Jane Doe

Idempotent.

---

# 4) Frontend Requirements (React)

## 4.1 Page `/value-instances`

Two main modes:

* **List view** (default)
* **Tree view** (hierarchy)

### Top bar

* Title: `Value Instances`
* Buttons:

  * `+ New Value Instance`
  * `Seed sample data`

### Filters

* Search
* Value dropdown
* Direction dropdown
* Visibility dropdown
* From Agent dropdown
* To Agent dropdown
* Sort dropdown
* Toggle: “Show hierarchy” (switch to tree view)

### Table columns

* Name
* Value
* Direction
* From → To (agents)
* Version
* Visibility badge
* Updated
* Actions (⋯)

Row click opens details drawer/page.

---

## 4.2 Tree View

* Display hierarchy as expandable nodes
* Show name + small badges (visibility, version)
* Quick actions: add child, edit, delete
* Clicking node shows details panel on the right (optional)

---

## 4.3 Create/Edit Form

Fields:

* Value (select)
* Name
* Purpose
* Direction (select)
* From Agent (select)
* To Agent (select)
* Version (input)
* Link (input)
* Image:

  * Upload new
  * Choose from library
  * Preview
* Visibility (public/private)
* Parent (optional select)

UX:

* If selecting parent, default same Value and visibility as parent (optional)
* Inline validation messages

---

# 5) Permissions / Visibility Rules

### MVP

* `public` and `private` only affect UI filtering (no public sharing)
* later: public instances could be shareable via link

---

# 6) Testing Requirements

## Backend

* create instance
* enforce at least one agent set (if MVP rule enabled)
* prevent hierarchy cycles
* prevent delete with children
* image must be image mimeType
* pagination/filtering works

## Frontend

* list renders
* filters work
* create/edit works
* tree view expands/collapses

---

# 7) Acceptance Criteria

* User can CRUD ValueInstances.
* ValueInstance references Value and supports from/to Agents.
* ValueInstance supports version, link, image, visibility.
* ValueInstances are hierarchical with tree browsing.
* List is paginated and filterable.

---

# Additional remarks

1. `fromAgentId` and `toAgentId` - one be null 
2. `visibility=public` means “public to the internet” later, 
3. children are allowed to reference a **different Value** than parent
4. Use autocomplete field for selecting Agents whenever possible
