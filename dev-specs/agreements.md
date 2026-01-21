## Claude Code Spec — Agreements Module (Hierarchical + Agents + File + Stats)

### Goal

Implement an **Agreements** module to manage legal/business agreements in a **hierarchical structure** (main agreement → annexes). Each Agreement:

* can be linked to multiple **Agents** (parties)
* can reference **one uploaded file**
* can include **link**, **gateway**, **content**, and **completedAt**
* is categorized as **Internal Market** or **External Market**

---

## Data Model

### Entity: `Agreement`

Fields:

* `id: UUID`
* `title: string` *(required, 2–200 chars)*
* `category: AgreementCategory` *(required)*
* `gateway: AgreementGateway` *(required)*
* `link: string | null` *(optional URL)*
* `content: string | null` *(optional, long text/markdown)*
* `completedAt: datetime | null` *(null = open agreement)*
* `parentId: UUID | null` *(null = root agreement; non-null = annex/sub-agreement)*
* `fileId: UUID | null` *(references one uploaded file)*
* `createdAt: datetime`
* `updatedAt: datetime`

### Enum: `AgreementCategory`

* `InternalMarket`
* `ExternalMarket`

### Enum: `AgreementGateway`

* `PenAndPaper`
* `Notary`
* `DocuSign`
* `Other`

### Many-to-Many: `AgreementParty`

Agreement ↔ Agent relationship.

#### Entity: `AgreementParty`

Fields:

* `agreementId: UUID`
* `agentId: UUID`
* `role: AgreementPartyRole` *(optional but recommended)*
* `createdAt: datetime`

### Enum: `AgreementPartyRole` *(optional, can start simple)*

* `Buyer`
* `Seller`
* `ServiceProvider`
* `Client`
* `Partner`
* `Employee`
* `Employer`
* `Other`

### Entity: `FileUpload` *(if not already existing in the app)*

Fields:

* `id: UUID`
* `originalName: string`
* `mimeType: string`
* `sizeBytes: number`
* `storageKey: string` *(path/key in storage)*
* `uploadedAt: datetime`

---

## Hierarchy Rules

* Agreements can have children (annexes, addendums, attachments, statements of work)
* Max depth: no hard limit required, but validate against cycles:

  * cannot set parentId to self
  * cannot set parentId to descendant

---

## Agreement Status

Derived from `completedAt`:

* `Open` if `completedAt == null`
* `Completed` if `completedAt != null`

---

## Backend API

### 1) List agreements (flat, paginated)

`GET /agreements`
Query params:

* `q` *(search title/content/agent names optional)*
* `category` *(InternalMarket | ExternalMarket)*
* `status` *(open | completed)*
* `gateway` *(PenAndPaper | Notary | DocuSign | Other)*
* `agentId` *(filter agreements where agent is a party)*
* `page`, `pageSize`
* `sort` (e.g. `updatedAt_desc`, `completedAt_desc`, `title_asc`)

Response:

```json
{
  "data": [
    {
      "id": "...",
      "title": "...",
      "category": "ExternalMarket",
      "gateway": "DocuSign",
      "link": "https://...",
      "completedAt": null,
      "parentId": null,
      "file": { "id": "...", "originalName": "..." },
      "parties": [
        { "agentId": "...", "name": "Acme Inc.", "role": "Client" }
      ],
      "childrenCount": 2,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 123
}
```

### 2) Get agreement tree

`GET /agreements/tree`

* Returns root agreements with nested children (for tree view)

### 3) Get single agreement details

`GET /agreements/:id`
Returns agreement with:

* parties
* file metadata
* children (optional)

### 4) Create agreement

`POST /agreements`
Body:

```json
{
  "title": "Master Service Agreement - Acme",
  "category": "ExternalMarket",
  "gateway": "DocuSign",
  "link": "https://docusign.com/...",
  "content": "Optional markdown text",
  "completedAt": null,
  "parentId": null,
  "partyAgentIds": ["uuid1", "uuid2"],
  "fileId": "uuid-file-or-null"
}
```

### 5) Update agreement

`PATCH /agreements/:id`
Body: any of fields:

* `title`, `category`, `gateway`, `link`, `content`, `completedAt`, `parentId`, `fileId`

### 6) Delete agreement

`DELETE /agreements/:id`
Behavior:

* block deletion if agreement has children: `409 Conflict`

  * message: `"Cannot delete an agreement that has annexes/children."`

### 7) Manage parties (simple)

Option B (more explicit):

* `POST /agreements/:id/parties` add agent
* `DELETE /agreements/:id/parties/:agentId` remove agent

### 8) Upload agreement file

If you already have a file module, reuse it.
Otherwise implement:

`POST /files`
multipart/form-data:

* `file`

Returns:

```json
{ "id": "uuid", "originalName": "...", "mimeType": "...", "sizeBytes": 12345 }
```

Then attach to agreement using `PATCH /agreements/:id` with `fileId`.

### 9) Agreement stats (for dashboard)

`GET /agreements/stats`
Query params (optional):

* `category`
* `agentId`

Response:

```json
{
  "openCount": 12,
  "completedCount": 34,
  "totalCount": 46
}
```

---

## Validation Rules

### Fields

* `title`: required, trimmed, 2–200 chars
* `category`: required enum
* `gateway`: required enum
* `link`: optional; if present must be valid URL (http/https)
* `content`: optional; max 50k chars (or similar)
* `completedAt`: optional datetime (ISO)
* `parentId`: optional UUID
* `fileId`: optional UUID (must exist if provided)
* `partyAgentIds`: optional but recommended to have at least 1 party

### Business Rules

* Must prevent cycles in hierarchy
* If `completedAt` set:

  * agreement becomes Completed
  * (optional) enforce completed agreements cannot be edited except content/link/file (your call; default: allow editing)

---

## Frontend Requirements (React, no Ant Design)

### Page: `/agreements`

Layout sections:

1. **Stats Dashboard** (top)
2. **Filters/Search + Actions**
3. **Agreements List** (tree-aware)

---

### 1) Stats Dashboard (Top)

Show 2–3 simple cards:

* **Open Agreements**: count where `completedAt == null`
* **Completed Agreements**: count where `completedAt != null`
* (optional) Total

Interaction:

* Clicking a card applies filter:

  * Open → status=open
  * Completed → status=completed

Data source:

* `GET /agreements/stats` (refetch when filters change)

---

### 2) Filters + Actions

Filters:

* Search input (`q`)
* Category dropdown: Internal / External
* Status dropdown: Open / Completed
* Gateway dropdown: Pen & Paper / Notary / DocuSign / Other
* Agent selector (optional): filter by party agent

Actions:

* `+ New Agreement`
* `Seed Sample Data`

---

### 3) Agreements List (Tree + Table Hybrid)

Display agreements in a list with indentation or expandable rows.

Each row shows:

* Title
* Category badge (Internal/External)
* Status badge (Open/Completed)
* Gateway
* Parties (agent chips)
* CompletedAt (if present)
* Link icon (if link exists)
* File icon + filename (if attached)
* “Annexes” count (childrenCount)

Row actions:

* View / Expand
* Edit
* Add Sub-agreement
* Mark Completed / Reopen
* Delete

Recommended UI behavior:

* Root agreements shown first
* Annexes nested under parent (expand/collapse)

---

## Agreement Create/Edit Form

Form fields:

* Title (input)
* Category (select)
* Gateway (select)
* Parties (multi-select agents)
* Link (input)
* Content (textarea/markdown editor)
* CompletedAt (datetime picker or “Mark completed” toggle)
* Parent Agreement (optional select for annex placement)
* File upload (single file)

Annex creation:

* “Add Sub-agreement” from a parent pre-fills `parentId`

File upload flow:

* Upload file → get `fileId`
* Save agreement with `fileId`

---

## Seed Data (Sample Agreements + Agents)

### Required Agents Seed (if not already present)

Create Agents (mix of Individuals + Organizations):

* **Marketlum Sp. z o.o.** (Organization)
* **Acme Corp** (Organization)
* **Globex Inc.** (Organization)
* **Jane Doe** (Individual)
* **John Smith** (Individual)

### Agreements Seed Tree

1. **Master Service Agreement — Acme Corp**

* category: `ExternalMarket`
* gateway: `DocuSign`
* parties: Marketlum + Acme Corp
* completedAt: null
* children:

  * **Annex A — Scope of Work**

    * gateway: DocuSign
    * completedAt: null
  * **Annex B — Pricing**

    * completedAt: null

2. **Employment Agreement — Jane Doe**

* category: `InternalMarket`
* gateway: `PenAndPaper`
* parties: Marketlum + Jane Doe
* completedAt: (some past date)

3. **NDA — Globex Inc.**

* category: `ExternalMarket`
* gateway: `Notary`
* parties: Marketlum + Globex Inc.
* completedAt: null

4. **Internal Value Stream Agreement — Product Team**

* category: `InternalMarket`
* gateway: `Other`
* parties: Marketlum + John Smith
* completedAt: null

Seed must be idempotent:

* Use stable codes in seed logic (e.g. titles + category + parent) to avoid duplicates.

---

## Sorting Rules

Default sorting:

* Open first, then completed
* Within open: `updatedAt desc`
* Within completed: `completedAt desc`

Tree display:

* Parent before children
* Children ordered by title

---

## Error Handling

* Deleting agreement with children → show message:
  `"Cannot delete an agreement that has annexes. Delete annexes first."`
* Invalid link → inline validation error
* Missing parties → `"Select at least one party."`

---

## Testing Requirements

### Backend tests

* create agreement root
* create annex (parentId set)
* prevent cycle
* attach file
* add/remove parties
* stats endpoint returns correct counts
* delete blocked when children exist

### Frontend tests (smoke)

* stats render and update with filters
* create agreement with parties
* add annex
* mark completed
* upload file and show attachment

---

## Acceptance Criteria

* Agreements can be created, edited, deleted (leaf only).
* Agreements can be nested (main + annex).
* Multiple Agents can be assigned to an agreement.
* Agreement can store: category, gateway, link, content, completedAt, file.
* Stats dashboard shows Open vs Completed counts above the list.
* Sample seed data inserts EU-like realistic agreements and parties without duplication.
