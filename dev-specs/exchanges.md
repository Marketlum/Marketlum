## Claude Code Spec — Exchanges Module (State Machine + Parties + Flows + Grouped by ValueStream)

### Goal

Implement an **Exchanges** module to manage “deals” / “value exchanges” between Agents, with:

* Name + purpose
* Multiple parties (Agents)
* Lifecycle via **state machine**: `open → completed → closed`
* Timestamps: `completedAt`, `closedAt`
* Link to one Agreement (select existing or create new)
* Reference to a Taxon (classification)
* Reference to a ValueStream (grouping)
* Reference to a Channel (where it happens)
* Assigned User as **Lead**
* Multiple **ExchangeFlows** describing value movement between parties

The Exchanges list must be **grouped by ValueStream**.

---

# 1) Data Model

## 1.1 Entity: `Exchange`

Fields:

* `id: UUID`
* `name: string` *(required, 2–200 chars)*
* `purpose: string | null` *(optional, max 500 chars)*
* `state: ExchangeState` *(required; default `open`)*
* `completedAt: datetime | null`
* `closedAt: datetime | null`

References:

* `agreementId: UUID | null` *(optional; references Agreement)*
* `taxonId: UUID | null` *(optional; references Taxon)*
* `valueStreamId: UUID` *(required; references ValueStream)*
* `channelId: UUID | null` *(optional; references Channel)*
* `leadUserId: UUID | null` *(optional; references User)*

Audit:

* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `completedAt` can be set only if state becomes `completed`
* `closedAt` can be set only if state becomes `closed`
* `closedAt >= completedAt` if both exist
* Must belong to a ValueStream

---

## 1.2 Enum: `ExchangeState`

* `open`
* `completed`
* `closed`

---

## 1.3 State Machine Rules

### Allowed transitions

* `open → completed`
* `open → closed` *(optional; allow “lost/cancelled”)*
* `completed → closed`
* `closed` is terminal (no transitions)

### Transition side effects

* Transition to `completed`:

  * set `completedAt = now` if null
* Transition to `closed`:

  * set `closedAt = now` if null
  * if `completedAt` is null, keep it null (exchange closed without completion)

Invalid transitions return `409 Conflict`.

---

## 1.4 Entity: `ExchangeParty`

Many-to-many between Exchange and Agent.

Fields:

* `id: UUID`
* `exchangeId: UUID`
* `agentId: UUID`
* `createdAt: datetime`

Constraint:

* unique `(exchangeId, agentId)`

---

## 1.5 Entity: `ExchangeFlow`

Represents a single “value movement” inside an exchange.

Fields:

* `id: UUID`
* `exchangeId: UUID` *(required)*
* `fromPartyAgentId: UUID` *(required; references Agent)*
* `toPartyAgentId: UUID` *(required; references Agent)*
* `valueId: UUID` *(required; references Value)*
* `quantity: number | null` *(optional)*
* `note: string | null` *(optional)*
* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `fromPartyAgentId !== toPartyAgentId`
* Both agents must be parties of the Exchange (recommended rule)
* `valueId` must exist

---

# 2) Backend API

## 2.1 Exchanges CRUD

### List Exchanges (grouped by ValueStream)

`GET /exchanges`
Query params:

* `q` (search by name/purpose)
* `state` (open/completed/closed)
* `valueStreamId` (optional filter)
* `leadUserId` (optional)
* `channelId` (optional)
* `taxonId` (optional)
* `agentId` (optional: exchanges where agent is a party)
* `sort` (default `updatedAt_desc`)
* pagination:

  * Either global pagination OR per-group pagination

**MVP recommendation:** global pagination + group in response.

Response shape:

```json
{
  "groups": [
    {
      "valueStream": { "id": "...", "name": "Consulting" },
      "exchanges": [
        {
          "id": "...",
          "name": "Coaching for XYZ Inc.",
          "state": "open",
          "leadUser": { "id": "...", "email": "..." },
          "channel": { "id": "...", "name": "Website" },
          "taxon": { "id": "...", "name": "Service" },
          "agreementId": "...",
          "completedAt": null,
          "closedAt": null,
          "partiesCount": 2,
          "flowsCount": 3,
          "updatedAt": "..."
        }
      ]
    }
  ],
  "total": 42
}
```

### Get Exchange Details

`GET /exchanges/:id`
Return:

* exchange fields
* parties[]
* flows[]
* referenced entities (valueStream, channel, taxon, agreement, lead)

### Create Exchange

`POST /exchanges`
Body:

```json
{
  "name": "Coaching for XYZ Inc.",
  "purpose": "Deliver 3-month coaching program",
  "valueStreamId": "uuid",
  "taxonId": "uuid-or-null",
  "channelId": "uuid-or-null",
  "leadUserId": "uuid-or-null",
  "agreementId": "uuid-or-null",
  "partyAgentIds": ["uuid1", "uuid2"]
}
```

Default state: `open`

### Update Exchange

`PATCH /exchanges/:id`
Editable:

* name, purpose
* valueStreamId
* taxonId
* channelId
* leadUserId
* agreementId
* parties (via dedicated endpoint recommended)

State not editable here (use transition endpoint).

### Delete Exchange

`DELETE /exchanges/:id`
MVP rule:

* allow delete only when state is `open`
* block if `completed/closed` (409)

---

## 2.2 State Transitions

### Transition

`POST /exchanges/:id/transition`
Body:

```json
{ "to": "completed" }
```

Rules:

* validate state machine
* set timestamps as needed

---

## 2.3 Parties Management

### Set parties (replace)

`PUT /exchanges/:id/parties`
Body:

```json
{
  "partyAgentIds": ["uuidA", "uuidB"]
}
```

Optional alternative endpoints:

* `POST /exchanges/:id/parties` add
* `DELETE /exchanges/:id/parties/:agentId` remove

MVP: replace list is simplest.

---

## 2.4 Exchange Flows CRUD

### Create Flow

`POST /exchanges/:id/flows`
Body:

```json
{
  "fromPartyAgentId": "uuidA",
  "toPartyAgentId": "uuidB",
  "valueId": "uuidValue",
  "quantity": 1,
  "note": "Monthly coaching sessions"
}
```

Validation:

* from/to agents must be parties of the exchange (recommended)

### Update Flow

`PATCH /exchanges/:id/flows/:flowId`
Editable:

* fromPartyAgentId
* toPartyAgentId
* valueId
* quantity
* note

### Delete Flow

`DELETE /exchanges/:id/flows/:flowId`

---

## 2.5 Agreement selection / creation shortcut

### Select existing agreement

Handled via `agreementId` on exchange.

### Create new agreement from exchange

Add convenience endpoint:
`POST /exchanges/:id/create-agreement`
Body:

```json
{
  "title": "Exchange Agreement — Coaching for XYZ Inc.",
  "category": "ExternalMarket",
  "gateway": "DocuSign",
  "partyAgentIds": ["uuidA", "uuidB"],
  "link": null,
  "content": null
}
```

Response:

```json
{ "agreementId": "uuid", "exchangeId": "uuid" }
```

---

# 3) Frontend Requirements (React)

## 3.1 Exchanges List Page `/exchanges`

Layout:

* Header: “Exchanges”
* Button: `+ New Exchange`
* Filters row
* Content grouped by ValueStream

### Filters

* Search (name/purpose)
* State dropdown: All/Open/Completed/Closed
* ValueStream dropdown (optional)
* Channel dropdown
* Lead dropdown
* Taxon dropdown
* Party Agent selector

### Grouped list

For each ValueStream group:

* group header:

  * ValueStream name
  * count of exchanges
  * optional stats: open/completed/closed counts
* list/table inside group:

  * Name
  * State badge
  * Lead
  * Parties count (click to preview)
  * Channel
  * Agreement indicator
  * UpdatedAt
  * Actions menu

Actions:

* View
* Edit
* Mark completed
* Close exchange
* Delete (open only)

---

## 3.2 Exchange Details Page `/exchanges/:id`

### Sections

1. Header:

* Name
* State badge
* Buttons:

  * Edit
  * Transition state (Complete / Close)
  * Add Flow

2. Summary card:

* Purpose
* ValueStream
* Taxon
* Channel
* Lead user
* Agreement (linked)

  * Select existing
  * Create new agreement shortcut

3. Parties section:

* Multi-select agents
* Show as chips
* Optional roles

4. Flows section (core)
   Table showing:

* From party (agent)
* To party (agent)
* Value
* Quantity (optional)
* Note
  Actions:
* Edit
* Delete

Optional visualization (later):

* Sankey diagram or flow arrows

---

# 4) Validation Rules & UX Constraints

## Required fields

* name
* valueStreamId

## Recommended constraints

* must have at least 2 parties to add flows
* flows must reference parties of exchange
* cannot transition to completed if no flows exist (optional but recommended)

---

# 5) Seed Data

Endpoint:
`POST /exchanges/seed`

Seed Agents:

* Marketlum (org)
* XYZ Inc. (org)
* Jane Doe (individual)

Seed ValueStreams:

* Consulting
* Software

Seed Values:

* Coaching Session (Service)
* Money PLN (Product)
* Relationship “Partnership” (Relationship)

Seed Channels:

* Website
* DocuSign (or “Contracting” channel)

Seed Taxons:

* “Service Exchange”
* “Partnership”

Seed Exchanges:

1. “Coaching for XYZ Inc.” (open)

* parties: Marketlum, XYZ Inc.
* channel: Website
* lead: admin user
* flows:

  * XYZ Inc. → Marketlum : Money PLN
  * Marketlum → XYZ Inc. : Coaching Session

2. “Partnership with Jane Doe” (completed)

* parties: Marketlum, Jane Doe
* flows:

  * Marketlum → Jane Doe : Right “Revenue Share”
  * Jane Doe → Marketlum : Service “Business Development”
* completedAt set

3. “Cancelled pilot with Globex” (closed)

* state: closed
* closedAt set

Idempotent.

---

# 6) Testing Requirements

## Backend

* create exchange
* add parties
* add flow only with valid parties
* state transitions set timestamps correctly
* invalid transitions rejected
* grouped list returns correct structure

## Frontend

* grouped list renders by ValueStream
* filters work
* create exchange works
* add flows works
* transition state updates UI

---

# 7) Acceptance Criteria

* User can create exchanges with name, purpose, value stream, parties.
* Exchanges are grouped by ValueStream in list view.
* Exchange supports state machine open/completed/closed with timestamps.
* Exchange can reference channel, taxon, agreement, lead user.
* Exchange can have multiple flows describing value transfer between parties.
* Agreement can be selected or created from within exchange.

---

# Questions (to clarify before coding)

1. **ExchangeFlows** should always require different parties
2. Agreement parties be synced automatically
3. “closed” means **lost/cancelled** 