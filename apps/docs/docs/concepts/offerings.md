---
sidebar_position: 5
---

# Offerings

Offerings package one or more values into a purchasable bundle with pricing.

## Structure

An offering consists of:

- **Name** and **purpose**
- **State** &mdash; either **Draft** or **Live**
- **Components** &mdash; a list of values with quantities and pricing formulas
- **Active period** &mdash; optional `activeFrom` and `activeUntil` dates

## Components

Each component references a value and specifies:

- **Quantity** &mdash; how many units are included
- **Pricing formula** &mdash; the price per unit or pricing logic
- **Pricing link** &mdash; optional reference to an external pricing source

## Relationships

- **Agent** &mdash; the provider of the offering
- **Value stream** &mdash; the stream this offering belongs to
