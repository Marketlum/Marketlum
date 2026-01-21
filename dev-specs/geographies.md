## Claude Code Spec — Geography Module (Hierarchical + Inline Editing)

### Goal

Implement a **Geography** module where users can manage a **hierarchical tree** of geographic entities. Each Geography has:

* `name`
* `code`
* `level` (Planet, Continent, Continental Section, Country, Region, City)

Requirements:

* Hierarchical structure (parent/children)
* Inline create/edit (no modal/drawer required)
* Each level has a unique icon
* Ability to seed sample data including **EU + USA geographies**

---

## Data Model

### Entity: `Geography`

Fields:

* `id: UUID`
* `name: string` *(required, 2–120 chars, trimmed)*
* `code: string` *(required, 2–32 chars, uppercase recommended)*
* `level: GeographyLevel` *(required)*
* `parentId: UUID | null` *(null = root)*
* `createdAt: datetime`
* `updatedAt: datetime`

### Enum: `GeographyLevel`

Allowed values (exact labels):

* `Planet`
* `Continent`
* `Continental Section`
* `Country`
* `Region`
* `City`

### Hierarchy Rules

Allowed parent relationships:

* Planet → Continent
* Continent → Continental Section OR Country
* Continental Section → Country
* Country → Region OR City
* Region → City
* City → *(no children)*

Disallow invalid parent/child level combinations.

---

## Backend (API)

### Endpoints

#### 1) Get full tree

`GET /geographies/tree`

* Returns: list of root geographies with nested children
* Response shape:

```json
[
  {
    "id": "...",
    "name": "Earth",
    "code": "EARTH",
    "level": "Planet",
    "children": [...]
  }
]
```

#### 2) Create geography

`POST /geographies`
Body:

```json
{
  "name": "Warsaw",
  "code": "PL-WAW",
  "level": "City",
  "parentId": "uuid-or-null"
}
```

Returns created Geography.

#### 3) Update geography (inline edit)

`PATCH /geographies/:id`
Body: any of:

```json
{ "name": "...", "code": "...", "level": "...", "parentId": "..." }
```

Returns updated Geography.

#### 4) Delete geography

`DELETE /geographies/:id`

* If node has children: block with `409 Conflict`
* Message: `"Cannot delete a geography that has children."`

#### 5) Move geography (optional convenience)

`POST /geographies/:id/move`
Body:

```json
{ "parentId": "uuid-or-null" }
```

Returns updated Geography.

#### 6) Seed sample data

`POST /geographies/seed`
Body (optional):

```json
{ "preset": "default" }
```

Returns:

```json
{ "inserted": 123, "skipped": 0 }
```

---

## Validation & Constraints

### Field validation

* `name`: required, trimmed, 2–120 chars
* `code`: required, trimmed, 2–32 chars

  * must be unique within the same parent (`parentId`)
  * store as uppercase (normalize on write)
* `level`: required enum value

### Uniqueness rules

* Within same `parentId`:

  * `code` must be unique (case-insensitive)
  * `name` should be unique (recommended, case-insensitive)

### Hierarchy validation

* Prevent cycles:

  * cannot set `parentId` to self
  * cannot set `parentId` to descendant
* Enforce level rules:

  * parent level must be exactly one of allowed parents for child’s level

---

## Frontend (React, no Ant Design)

### Page: `/geography`

Layout:

* Title: `Geography`
* Actions:

  * `Seed EU + USA`
  * `Add root geography`
  * Search input (filter by name/code)

### Tree UI

Use a tree component or implement custom:

* `@radix-ui/react-collapsible` + recursion OR `react-arborist` OR `dnd-kit` later
* Display:

  * Icon based on `level`
  * `name` (primary)
  * `code` (secondary / muted)
  * `level` badge

### Inline editing requirements

Editing must happen inline inside the row:

* Clicking on `name` or an `Edit` icon turns row into edit mode.
* Edit mode shows:

  * Name input
  * Code input
  * Level select (dropdown)
  * Save / Cancel buttons (or Enter/Escape support)

Inline create:

* `Add child` button on each node
* Inserts a temporary inline row under the parent
* Fields:

  * Name
  * Code
  * Level (default to the next logical level)
* Save creates via `POST /geographies`
* Cancel removes draft row

Inline UX rules:

* `Enter` = Save
* `Escape` = Cancel
* Show validation errors inline (under inputs)
* Disable Save while submitting
* Optimistic UI optional (not required)

### Icons per level (unique)

Implement mapping `GeographyLevel -> IconComponent`
Use lucide-react (or your icon set). Example mapping:

* Planet → `Globe`
* Continent → `Map`
* Continental Section → `Layers`
* Country → `Flag`
* Region → `Landmark`
* City → `Building2`

Icons must be visually distinct and consistent in size.

---

## Seed Data Requirements (EU + USA)

### Preset: “default”

Tree should include at least:

* Planet: **Earth** (`EARTH`)

  * Continent: **Europe** (`EUROPE`)

    * Continental Section: **European Union** (`EU`)

      * Country: **Poland** (`PL`)

        * City: **Warsaw** (`PL-WAW`)
        * City: **Łódź** (`PL-LDZ`)
      * Country: **Germany** (`DE`)

        * City: **Berlin** (`DE-BER`)
      * Country: **France** (`FR`)

        * City: **Paris** (`FR-PAR`)
    * Country: **United Kingdom** (`GB`)

      * City: **London** (`GB-LON`)

  * Continent: **North America** (`NORTH-AMERICA`)

    * Country: **United States** (`US`)

      * Region: **California** (`US-CA`)

        * City: **San Francisco** (`US-CA-SF`)
        * City: **Los Angeles** (`US-CA-LA`)
      * Region: **New York** (`US-NY`)

        * City: **New York City** (`US-NY-NYC`)
      * Region: **Texas** (`US-TX`)

        * City: **Austin** (`US-TX-AUS`)

Seeding must be idempotent:

* Re-running seed should not duplicate entries.
* Use `(parentId + code)` uniqueness to detect existing nodes.

---

## Sorting & Display Rules

* Default sort order in tree:

  1. `level` order (Planet → ... → City)
  2. `name` alphabetical
* Display `code` in monospace / muted text
* Allow expand/collapse per node
* Persist expanded state in local state (no need to store in DB)

---

## Error Handling

* If delete fails due to children: show message `"Cannot delete: this geography has children."`
* If code conflicts: show `"Code already exists under this parent."`
* If invalid level change: show `"Invalid level for selected parent."`

---

## Testing Requirements

### Backend tests

* create root Planet
* create child Continent under Planet
* reject City under Planet (invalid parent level)
* reject cycles on move
* delete leaf works
* delete non-leaf returns 409
* seed creates expected nodes
* seed is idempotent

### Frontend tests (lightweight)

* inline create: add child -> save -> appears in tree
* inline edit: change name -> save -> updates
* cancel inline edit restores original
* validation errors display

---

## Acceptance Criteria

* User can view geography hierarchy as a tree.
* User can create/edit geographies inline.
* Each level displays a unique icon.
* User can seed EU + USA dataset (idempotent).
* Hierarchy rules are enforced (no invalid parent/child relationships).
* Deleting a node with children is blocked with clear feedback.
