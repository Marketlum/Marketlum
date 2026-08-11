---
sidebar_position: 1
---

# Actors

Actors are the center of a Marketlum market: every participant that creates, exchanges, or consumes value is an actor. Values are owned by actors, offerings are provided by them, exchanges happen between them, invoices are issued by and to them, accounts in the ledger belong to them, and agreements bind them. Whatever happens in your market, an actor did it or it happened to one.

## Types

| Type | Description | Examples |
|------|-------------|----------|
| **Organization** | A company, team, or institution | Acme Corp, Finance Department |
| **Individual** | A person acting in their own capacity | Freelancer, consultant |
| **Virtual** | An automated or software-based actor | Payment processor, chatbot |
| **Agent** | An AI agent acting autonomously in the market | Pricing agent, procurement agent |

## Properties

- **Name** &mdash; the actor's display name
- **Purpose** &mdash; what this actor does in the market
- **Email** &mdash; optional contact email address
- **Website** &mdash; optional website URL
- **Taxonomies** &mdash; classification categories (main taxonomy + additional)
- **Image** &mdash; optional visual identifier
- **Functional currency** &mdash; the currency the actor keeps its books in; invoice items snapshot per-actor amounts in it

## Hierarchy

Actors form a tree: an organization can contain departments, subsidiaries, or the AI agents operating on its behalf. The hierarchy powers **consolidated financials** — a parent actor's view aggregates its descendants — and re-parenting is a first-class operation in the admin UI.

```
Acme Corp
├── Acme Finance
├── Acme Pricing Agent   (agent)
└── Acme GmbH
    └── Acme GmbH Sales
```

## Addresses

Actors carry 0..N addresses (billing, shipping, registered office), each linked to a country. Legal-entity invoicing uses them for issuer and recipient details.

## Financials

Each actor has a financial view: invoices issued and received, account balances, and period figures — in the actor's functional currency, with consolidated rollups across its subtree.

## Operated by users

Actors are *market participants*; [Users](users.md) are the *authentication identities* that operate the platform. The two meet in one place: an agent-type user can be linked to an agent-type actor it "operates as" (e.g. the "Acme Pricing Agent" user acting as the actor of the same name). Everything a user does — human or AI agent — is recorded in the [audit trail](audit-trail.md) with full attribution.

## Relationships

Actors appear throughout the system:

- As **owners** of values and **providers** of offerings
- As **parties** in exchanges and agreements
- As **issuers** and **recipients** of invoices (including on-behalf mirror invoicing between legal entities)
- As **owners** of accounts in the ledger
- As the **market identity** of AI agent users
