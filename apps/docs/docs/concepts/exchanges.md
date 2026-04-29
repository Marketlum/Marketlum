---
sidebar_position: 4
---

# Exchanges

Exchanges represent transactions between market participants. They are the primary mechanism through which value changes hands.

## Structure

An exchange consists of:

- **Parties** &mdash; two or more agents involved, each with a role (e.g., Seller, Buyer)
- **Flows** &mdash; the directional movement of values between parties
- **State** &mdash; the current status of the exchange

## States

Exchanges follow a state machine: **Open** &rarr; **Completed** or **Closed**.

- A new exchange starts as **Open**
- It can be **Completed** when all flows are fulfilled
- It can be **Closed** if cancelled or abandoned
- A closed or completed exchange can be **Reopened**

## Flows

Each flow represents a directional transfer of value:

- **From agent** &rarr; **To agent**
- References a specific **value** or **value instance**
- Includes a **quantity**

A typical exchange has at least two flows: one in each direction (e.g., product from seller to buyer, payment from buyer to seller).

## Context

Exchanges can be linked to:

- A **value stream** they belong to
- A **channel** through which they occur
- A **pipeline** stage for tracking progress
- A **tension** they address
- A **lead user** responsible for the exchange
