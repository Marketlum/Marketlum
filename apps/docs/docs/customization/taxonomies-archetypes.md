---
sidebar_position: 8
---

# Taxonomies & Archetypes

Most domain customization in Marketlum is **configuration, not code**. Taxonomies and archetypes let you reshape the meaning of values, agents, and value streams without writing TypeScript or running migrations. Everything in this page is editable from the admin UI by an authenticated admin user.

## When to use config vs. code

| Need | Approach |
|------|----------|
| Categorize values into product / service / right / relationship | Taxonomy |
| Group agents by role or segment | Taxonomy |
| Define a recurring shape for values (e.g. &quot;SaaS subscription&quot;) | Archetype |
| Add a structured field to every value of a kind | Archetype (custom property) |
| Add an entirely new entity type | Code &mdash; see [Extending the API](/customization/extending-api) |
| Change how an existing entity behaves | Code &mdash; not customization |

If your need fits in the top half of the table, prefer the admin UI. You avoid migrations and your customization survives upgrades.

## Taxonomies

A taxonomy is a labeled tree. Each node can be attached to a value, agent, value stream, exchange, or other taggable entity. The framework ships with a small set of starter taxonomies; you can add your own from the **Taxonomies** admin page.

Typical taxonomies a market might define:

- **Industry** &mdash; Healthcare &gt; Telemedicine, Finance &gt; Lending, &hellip;
- **Customer segment** &mdash; SMB, Enterprise, Government, &hellip;
- **Region** &mdash; in addition to the structured `Geography` model, if you want a softer overlay
- **Lifecycle stage** &mdash; Concept, Pilot, GA, Sunset, &hellip;

Taxonomies are multi-attach: a single value can sit in many taxonomies at once. They are also hierarchical, so filtering by a parent node picks up everything below it.

## Archetypes

An archetype is a named template for a value. It defines:

1. The taxonomies that should pre-populate when a value of this kind is created.
2. The structured properties (key/value/type) that capture the value&apos;s distinguishing fields.
3. A default `valueType` (e.g. *Service*, *Product*, *Relationship*).

For example, a **SaaS Subscription** archetype might declare:

- Pre-attached taxonomy nodes: `Type = Service`, `BillingFrequency = Recurring`
- Properties: `tier` (string), `seats` (number), `trialDays` (number)
- Default `valueType`: `Service`

When an admin creates a new value and picks the SaaS Subscription archetype, the form already knows to ask for `tier`, `seats`, and `trialDays` &mdash; no schema change needed.

Manage archetypes from the **Archetypes** admin page.

## Locales

Domain-content translations (names and descriptions of values, agents, etc.) live in the database as `Locale` rows. They are separate from UI strings (see [Translations & Locales](/customization/translations)).

Add or remove locales from the **Locales** admin page. Every translatable record carries a per-locale name and description; the active locale at request time determines what the user sees.

## Geographies

Countries, regions, and cities live in a hierarchical `Geography` table. Seed your initial set with `pnpm seed:sample` or build your own seed (see [Seed Data](/customization/seed-data)). Edit and extend from the **Geographies** admin page.

## When to graduate from config to code

Config has limits:

- You can&apos;t add fields that need their own validation or indexes.
- You can&apos;t change how an entity behaves (only how it&apos;s categorized).
- You can&apos;t introduce relationships between archetype properties.

When you hit one of those limits, [extend the API](/customization/extending-api) with a sibling module that owns its own entities. Keep core untouched.
