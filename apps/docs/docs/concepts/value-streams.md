---
sidebar_position: 7
---

# Value Streams

Value streams are a **grouping mechanism**: they organize related values, exchanges, offerings, and pipelines into named flows so a large market stays navigable. They add structure and reporting lenses on top of the actor-centric domain — the activity itself belongs to [actors](actors.md); a value stream is how you choose to group it.

## Overview

A value stream answers the question: *"Which flow of work does this activity belong to?"*

Examples:
- **Product Development** &mdash; grouping the values and exchanges from ideation to delivery
- **Customer Acquisition** &mdash; from lead generation to conversion
- **Order Fulfillment** &mdash; from order placement to delivery

Membership is optional — an exchange or value can exist without any stream; assigning one is an organizational choice, not a requirement.

## Hierarchy

Value streams are hierarchical. A root stream can contain child streams, allowing you to group at both a high level and in detail:

```
General Company Stream
├── Batteries Manufacturing
├── Industrial Implementation
├── People
├── Market Development
├── Licensing Ecosystem
└── Backoffice Operations
```

## Relationships

- **Lead** &mdash; a user responsible for the stream
- **Values** &mdash; values grouped into the stream
- **Exchanges** &mdash; transactions optionally assigned to the stream
- **Offerings** &mdash; bundles sold within the stream
- **Pipelines** &mdash; sales stages tracking deals in the stream

## Visualization

The web UI offers two views for value streams:

- **Tree view** &mdash; hierarchical list with expand/collapse, search, and inline actions
- **Circle packing** &mdash; D3 zoomable visualization showing the hierarchy as nested circles
