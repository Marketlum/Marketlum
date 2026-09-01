---
sidebar_position: 8
---

# Tensions

Tensions represent gaps between the current state and a desired future state. They are the driving force behind market evolution and exchange.

## Structure

A tension captures:

- **Name** &mdash; a short description of the gap
- **Current context** &mdash; what the situation looks like today
- **Potential future** &mdash; what could be achieved
- **Score** &mdash; urgency/importance rating from 1 to 10
- **Actor** &mdash; the entity experiencing the tension
- **Lead user** &mdash; the person responsible for addressing it

## Purpose

Tensions help you identify and prioritize market opportunities. They can be linked to exchanges, connecting the *why* (tension) to the *what* (exchange).

## Examples

| Tension | Score | Current Context | Potential Future |
|---------|-------|----------------|-----------------|
| Slow onboarding cycle | 8 | 6+ weeks to go live | Automated onboarding in 1 week |
| Manual invoice reconciliation | 7 | 20 hours/week manual matching | Automated with 99% accuracy |
| Data silos across teams | 9 | Separate tools, no integration | Unified platform with cross-team visibility |

## Event sourcing

Tensions are the first **event-sourced** aggregate in Marketlum. The `tensions`
table is a projection; the record of truth is the tension's stream in
`domain_events`. See [Event sourcing](../customization/event-sourcing.md) for
the store, the rebuild command and the schema-evolution policy.

Practically, this changes three things.

### Writes are commands, not a PATCH

There is no `PATCH /tensions/:id`. Each change is its own endpoint, and each
appends exactly one event:

| Endpoint | Event |
|---|---|
| `POST /tensions` | `TensionSensed` |
| `POST /tensions/:id/rename` | `TensionRenamed` |
| `POST /tensions/:id/rescore` | `TensionRescored` |
| `POST /tensions/:id/revise` | `TensionContextRevised` |
| `POST /tensions/:id/lead` | `TensionLeadAssigned` / `TensionLeadUnassigned` |
| `POST /tensions/:id/reassign` | `TensionReassigned` |
| `POST /tensions/:id/resolve` | `TensionResolved` |
| `POST /tensions/:id/drop` | `TensionDropped` |
| `POST /tensions/:id/reopen` | `TensionReopened` |
| `POST /tensions/:id/revive` | `TensionRevived` |
| `DELETE /tensions/:id` | `TensionDiscarded` |

A command that would change nothing — renaming to the same name, rescoring to
the same score — is a no-op: it returns `200` and appends no event.

Concurrent writers are detected: if the stream advanced while your request was
in flight you get `409 Conflict`, and should reload before retrying.

### History is a first-class read

`GET /tensions/:id/history` returns the stream as a timeline, newest first.
Each entry carries a rendered `summary` plus `summaryKey`/`summaryParams` so the
admin UI can localise it. The tension detail page shows this timeline, and each
field on that page is edited in place through its own command.

### Deleting an actor discards its tensions

`tensions.actorId` is `ON DELETE RESTRICT`. Deleting an actor now discards its
tensions through the command path first, in the same transaction, so every
deletion is recorded as an event. Before this, a database cascade removed them
silently and a projection rebuild would have resurrected them.
