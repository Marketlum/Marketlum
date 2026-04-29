---
sidebar_position: 1
---

# Value Streams

Value streams are the backbone of a Marketlum market. They represent the end-to-end flows through which value is created and delivered to market participants.

## Overview

A value stream answers the question: *"How does value flow from creation to consumption in this market?"*

Examples:
- **Product Development** &mdash; from ideation to delivery
- **Customer Acquisition** &mdash; from lead generation to conversion
- **Order Fulfillment** &mdash; from order placement to delivery

## Hierarchy

Value streams are hierarchical. A root stream can contain child streams, allowing you to model both high-level flows and their detailed sub-processes:

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

Value streams connect to many other entities:

- **Lead** &mdash; a user responsible for the stream
- **Values** &mdash; the products, services, and rights flowing through
- **Exchanges** &mdash; transactions that occur within the stream
- **Offerings** &mdash; packaged bundles sold through the stream
- **Pipelines** &mdash; sales stages tracking deals in the stream

## Visualization

The web UI offers two views for value streams:

- **Tree view** &mdash; hierarchical list with expand/collapse, search, and inline actions
- **Circle packing** &mdash; D3 zoomable visualization showing the hierarchy as nested circles
