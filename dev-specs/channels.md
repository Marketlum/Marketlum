### Feature: Channels 

Implement a **Channels** module where users can manage a **hierarchical list (tree)** of Channels. Channels represent “ways the organization reaches the market and performs exchanges”.

---

### Data Model

#### Entity: `Channel`

Fields:

* `id: UUID`
* `name: string` *(required, 2–120 chars)*
* `purpose: string` *(optional, 0–500 chars)*
* `type: ChannelType` *(required)*
* `parentId: UUID | null` *(null = root channel)*
* `children: Channel[]` *(computed in API responses for tree endpoints)*
* `createdAt: datetime`
* `updatedAt: datetime`

#### Enum: `ChannelType`

Use one of:
`website | web_app | mobile_app | marketplace | social_media | messaging | email | paid_ads | partner | retail_store | event | field_sales | print | b2b_outbound | b2b_inbound | other`

---

### Backend Requirements (API)

#### Endpoints

1. **List Channels as Tree**

* `GET /channels/tree`
* Returns: `Channel[]` roots with nested `children`

2. **List Channels Flat (optional but useful)**

* `GET /channels`
* Query params:

  * `parentId` (optional)
  * `type` (optional)
* Returns: flat list

3. **Create Channel**

* `POST /channels`
* Body:

  * `name`
  * `purpose?`
  * `type`
  * `parentId?`
* Returns: created channel

4. **Update Channel**

* `PATCH /channels/:id`
* Body: any of `name`, `purpose`, `type`, `parentId`
* Returns: updated channel

5. **Delete Channel**

* `DELETE /channels/:id`
* Behavior: **block deletion if channel has children**

  * return `409 Conflict` with message: `"Cannot delete a channel that has children."`

6. **Move Channel (optional convenience)**

* `POST /channels/:id/move`
* Body: `{ parentId: UUID | null }`
* Returns updated channel

---

### Validation Rules

* `name` required, trimmed, length 2–120
* `purpose` optional, trimmed, max 500
* `type` required and must be a valid enum value
* Prevent cycles:

  * cannot set `parentId` to self
  * cannot set `parentId` to a descendant
* Sibling uniqueness (recommended):

  * within the same parent, `name` must be unique (case-insensitive)

---

### UI Requirements (Next.js + React)

#### Page: `/channels`

Layout:

* Header: “Channels”
* Primary actions:

  * `+ New Channel`

#### Tree UI

* Each node shows:

  * `name`
  * small tag/badge with `type`
* Node actions (hover or context menu):

  * Edit
  * Add child
  * Delete

#### Form (Create/Edit)

Fields:

* Name (Input)
* Purpose (TextArea)
* Type (Select with labels)
* Parent (TreeSelect) *(optional, for moving)*

Form behavior:

* Create:

  * if “Add child” clicked, parent preselected
* Edit:

  * can update all fields
* Show errors from API nicely (validation + conflicts)

#### Optional UX Enhancements

* Search input (filter tree by name)
* Expand/collapse all
* Drag & drop reorder / move (only if easy)

---

### Testing Requirements

Unit tests:

* create channel
* create child channel
* prevent cycle on move
* prevent delete when children exist

API integration tests:

* `GET /channels/tree` returns nested structure correctly

UI sanity:

* create root channel
* add child
* edit channel
* delete leaf

---

### Acceptance Criteria

* User can create, edit, and delete **leaf** channels.
* User can build multi-level hierarchy.
* Tree loads from API and renders nested children.
* Channel type is selectable and displayed.
* No cyclic parent relationships possible.
* Deleting a channel with children is blocked with clear feedback.