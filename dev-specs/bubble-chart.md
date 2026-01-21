## Claude Code Spec — Value Bubble Chart (D3 Zoomable Circle Packing)

### Goal

Implement a **Bubble Chart view** for the **Value hierarchy** using **D3.js Zoomable Circle Packing** to visualize nested Value nodes (Product/Service/Relationship/Right).
Users should be able to:

* See the full hierarchy as nested bubbles
* Click to **zoom in/out**
* Hover to see details
* Click a node to open Value details (optional)
* Filter / color by Value type

---

# 1) Data Requirements

## 1.1 Value Entity (assumed existing)

Each Value node should have:

* `id: UUID`
* `name: string`
* `purpose: string | null`
* `type: ValueType` (`Product | Service | Relationship | Right`)
* `children: Value[]`

Optional fields for better UX:

* `description: string | null`
* `createdAt`, `updatedAt`
* `isActive: boolean` (optional)

---

## 1.2 API Endpoint (tree)

Add/ensure endpoint:

### `GET /values/tree`

Returns hierarchical structure:

```json
[
  {
    "id": "uuid",
    "name": "Taxonomies",
    "type": "Product",
    "purpose": "Distilled wisdom...",
    "children": [
      {
        "id": "uuid",
        "name": "Value",
        "type": "Product",
        "purpose": "...",
        "children": []
      }
    ]
  }
]
```

Notes:

* Return only needed fields for chart (avoid heavy payloads)
* Tree must be consistent (no cycles)
* Nodes may have empty children array

---

# 2) Chart View UX

## 2.1 Page / Route

Add a new view for Value:

* Route: `/value/bubbles` *(or `/value/chart`)*

Navigation:

* Add button/tab on Value page:

  * `List`
  * `Tree`
  * `Bubbles` (new)

---

## 2.2 Interactions

### Zoom behavior

* Click a bubble to zoom into that node
* Clicking the background zooms out to parent
* Smooth animated transitions (300–750ms)

### Hover behavior

* Show tooltip with:

  * Name
  * Type
  * Purpose (truncate)
  * Children count
  * Depth level

### Selection behavior

* Single click zooms (default)
* Optional: double click opens details drawer/page:

  * `/value/:id`

### Breadcrumb / Current focus

At top of chart:

* Breadcrumb showing zoom path:

  * `All Values > Taxonomies > Value > Product`
* Clicking breadcrumb zooms to that level

---

# 3) Visual Design Requirements

## 3.1 Layout

* Full-width responsive canvas/SVG
* Minimum height: 70vh
* Centered packing layout
* Use padding between circles (e.g. 2–6px depending on depth)

## 3.2 Labels

* Show label text for:

  * current focus children
  * only if circle radius > threshold (e.g. > 18px)
* Truncate long names with ellipsis
* Optional: show type icon or short type badge inside label

## 3.3 Coloring

Color nodes by `Value.type`:

* Product
* Service
* Relationship
* Right

Opacity:

* Focused branch = full opacity
* Non-focused nodes = reduced opacity

Stroke:

* Slight outline for readability
* On hover: highlight stroke

---

# 4) Controls (Top Bar)

Add a small control bar above chart:

### Controls

* Search input: `Find value…`

  * highlights matches
  * pressing Enter zooms to first match
* Toggle: `Color by type` (on/off)
* Toggle: `Show labels` (on/off)
* Button: `Reset zoom`
* Optional: `Export PNG` (later)

---

# 5) D3 Implementation Requirements

## 5.1 Libraries

* `d3-hierarchy` for circle packing
* `d3-selection`
* `d3-transition`
* `d3-zoom` (optional; click-to-zoom is enough)

Use the official D3 Zoomable Circle Packing pattern:

* `d3.pack()`
* `d3.hierarchy(data).sum(...)`
* transitions between focus nodes

---

## 5.2 Data mapping for pack()

Circle packing needs numeric size per node.

### Node size strategy (MVP)

Use synthetic size so all leaves are equal:

* `node.value = 1` for leaves
* internal nodes sum automatically

Implementation:

```js
hierarchy.sum(d => d.children?.length ? 0 : 1)
```

Alternative (later):

* size based on number of Value Instances
* size based on revenue/usage metrics

---

## 5.3 Component Structure

Create component:

* `ValueBubbleChart.tsx`

Responsibilities:

* fetch tree data
* transform into D3 hierarchy root
* render SVG
* manage focus state (zoom target)
* handle resize events

Use `ResizeObserver` to re-render on container size change.

---

## 5.4 Rendering Approach

Recommended:

* Use React for layout + controls
* Use D3 for layout calculations + transitions

Implementation pattern:

* `useEffect` initializes SVG + circles
* `useMemo` for hierarchy computation
* `useRef` for svg element and stateful focus

---

# 6) Performance Requirements

* Must support at least **1,000 nodes** smoothly
* Avoid re-creating entire SVG on every hover
* Debounce search input
* Render labels only when needed

If nodes > 2,000:

* show warning: “Large hierarchy — labels hidden for performance”

---

# 7) Accessibility

* Tooltip must also be accessible via keyboard focus (optional)
* Provide “Reset zoom” button for non-mouse users
* Provide fallback list link:

  * “Switch to list view”

---

# 8) Error & Empty States

### Loading

* show skeleton / spinner “Loading value map…”

### Empty tree

* “No values yet”
* CTA: “Create your first Value”

### Error

* show message and retry button

---

# 9) Testing Requirements

## Unit tests

* tree data transforms into hierarchy correctly
* search finds correct node(s)
* focus state updates when clicking node

## E2E tests (optional)

* chart loads
* click bubble zooms in
* reset zoom works

---

# 10) Acceptance Criteria

* Bubble chart displays Value hierarchy as nested circles.
* Clicking a node zooms in; background click zooms out.
* Tooltip shows node details.
* Colors reflect Value type.
* Chart is responsive and works on typical laptop screens.
* Search can locate and highlight nodes.
* Reset zoom returns to root.

---

# Open Questions (answer when ready)

1. Should clicking a bubble **zoom only**, or **open details**? (I recommend click=zoom, double click=open)
2. Do you want bubble size to represent something meaningful now (e.g. number of children), or keep equal leaves for MVP?
3. Should the chart show **multiple roots** (forest) or enforce a single root “Value”?
