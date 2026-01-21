## Claude Code Spec — Locales Module (CRUD + Paginated List)

### Goal

Implement a **Locales** module that allows users to manage a simple list of supported **Locales**.
Each Locale has:

* `code`
* `createdAt`

The UI must provide full **CRUD** and the list must be **paginated**.

---

# 1) Data Model

## Entity: `Locale`

Fields:

* `id: UUID`
* `code: string` *(required, unique)*
* `createdAt: datetime` *(required, auto-set on create)*

### Validation Rules

* `code` is required, trimmed
* `code` must be unique (case-insensitive)
* Normalize stored code to a consistent format:

  * recommended: lowercase language + optional uppercase region
    Examples:
  * `en`
  * `en-US`
  * `pl-PL`
  * `de-DE`

Constraints:

* length: 2–16 characters
* allowed characters: letters + `-`

---

# 2) Backend API

## 2.1 List Locales (paginated)

`GET /locales`
Query params:

* `page` *(default 1)*
* `pageSize` *(default 20, max 100)*
* `q` *(optional search by code)*
* `sort` *(optional: `createdAt_desc` default, `code_asc`)*

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "en-US",
      "createdAt": "2026-01-21T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

## 2.2 Create Locale

`POST /locales`
Body:

```json
{
  "code": "pl-PL"
}
```

Response: created Locale.

Errors:

* `409 Conflict` if code already exists:
  `"Locale code already exists."`

## 2.3 Update Locale

`PATCH /locales/:id`
Body:

```json
{
  "code": "en-GB"
}
```

Rules:

* Must remain unique
* Normalize formatting before saving

## 2.4 Delete Locale

`DELETE /locales/:id`

* Returns `204 No Content`

---

# 3) Frontend Requirements (React)

## Page: `/locales`

### Layout

* Header: `Locales`
* Button: `+ Add Locale`
* Search input (optional): filter by code
* Paginated table/list

### Table Columns

* `Code`
* `Created`
* Actions: `Edit`, `Delete`

### Create / Edit

Simple inline form OR small modal (either acceptable).
Fields:

* `code`

Behavior:

* On create success: refresh list (stay on current page if possible)
* On delete: remove from list and refresh if needed

### Pagination

* page size selector: 10 / 20 / 50 / 100
* next/prev + page number

---

# 4) Seed Data (Optional)

Provide seed endpoint:
`POST /locales/seed`

Seed codes:

* `en-US`
* `en-GB`
* `pl-PL`
* `de-DE`
* `fr-FR`
* `es-ES`

Idempotent:

* do not duplicate existing codes

---

# 5) Testing Requirements

## Backend

* create locale
* prevent duplicates (case-insensitive)
* list pagination returns correct total/page
* update locale code
* delete locale

## Frontend

* list renders paginated
* create locale updates list
* edit locale updates list
* delete locale removes entry

---

# 6) Acceptance Criteria

* User can create, view (paginated), edit, and delete Locales.
* Locale consists only of `code` and `createdAt`.
* Duplicate locale codes are rejected.
* Pagination works reliably with large lists.
