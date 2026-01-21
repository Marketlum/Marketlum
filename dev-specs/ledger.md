## Claude Code Spec — Ledger Module (Accounts + Transactions)

### Goal

Implement a **Ledger** module that lets users:

* Create **Accounts** to track balances of specific **Value** (e.g. currency product like PLN, or service usage like “Marketlum Coaching for XYZ Inc.”)
* Record **Transactions** between Accounts (From → To)
* Support **positive or negative amounts**
* Mark Transactions as **verified / unverified**
* Provide basic list views, filters, and summary info

This module should be usable for lightweight internal accounting, value flow tracking, and micro-enterprise economics.

---

# 1) Domain Model

## 1.1 Entity: `Account`

Represents a bucket of balance for a specific Value, owned by an Agent.

Fields:

* `id: UUID`
* `name: string` *(required, 2–160 chars)*
* `description: string | null` *(optional, max 1000 chars)*
* `ownerAgentId: UUID` *(required; references Agent)*
* `valueId: UUID` *(required; references Value)*
* `balance: number` *(required; derived or stored; see Balance Rules)*
* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `name` unique per owner (recommended)
* An Account must reference exactly **one** Value
* Owner must exist as an Agent
* Value must exist

### Balance Rules (choose one approach)

**MVP approach:** store `balance` on Account and update it on transaction create/update/delete.
**Safer approach:** compute balance as sum of transactions (slower but always consistent).

**Spec requirement:** implement **stored balance with recalculation endpoint**:

* `balance` is updated automatically when transactions are created/updated/deleted.
* Provide admin endpoint to recalc balances.

---

## 1.2 Entity: `Transaction`

Represents a transfer of an amount between two accounts.

Fields:

* `id: UUID`
* `fromAccountId: UUID` *(required)*
* `toAccountId: UUID` *(required)*
* `amount: number` *(required; can be positive or negative)*
* `timestamp: datetime` *(required; default now)*
* `verified: boolean` *(default false)*
* `note: string | null` *(optional; recommended for auditability)*
* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `fromAccountId !== toAccountId`
* Both accounts must exist
* `amount !== 0`
* Allow negative amounts (see semantics below)

### Amount Semantics

A Transaction always moves `amount` from `fromAccount` to `toAccount`.

When a transaction is applied:

* `fromAccount.balance -= amount`
* `toAccount.balance += amount`

This works even for negative amounts:

* Negative amount effectively reverses direction without swapping accounts.

Example:

* From A → To B, amount = `100`

  * A decreases by 100, B increases by 100
* From A → To B, amount = `-100`

  * A increases by 100, B decreases by 100

---

## 1.3 Optional: Verification Semantics

Two possible interpretations:

Option A (simple): `verified` is just a label; balances always update regardless.
Option B (accounting-like): only verified transactions affect balance.

**Default for MVP:** Option A (balances always reflect all transactions).
Later you can add “availableBalance” vs “verifiedBalance”.

---

# 2) Backend API

## 2.1 Accounts

### Create Account

`POST /ledger/accounts`
Body:

```json
{
  "name": "PLN Cash",
  "ownerAgentId": "uuid-agent",
  "valueId": "uuid-value-pln",
  "description": "Cash account for PLN"
}
```

Returns created Account.

### List Accounts

`GET /ledger/accounts`
Query params:

* `q` (search by name/description)
* `ownerAgentId`
* `valueId`
* `page`, `pageSize`
* `sort` (name_asc, balance_desc, updatedAt_desc)

Returns:

```json
{
  "data": [
    {
      "id": "...",
      "name": "PLN Cash",
      "ownerAgentId": "...",
      "valueId": "...",
      "description": "...",
      "balance": 1234.56
    }
  ],
  "total": 10
}
```

### Get Account Details

`GET /ledger/accounts/:id`
Returns account + (optional) last N transactions.

### Update Account

`PATCH /ledger/accounts/:id`
Body: any of:

```json
{ "name": "...", "description": "...", "ownerAgentId": "...", "valueId": "..." }
```

**Important rule:** changing `valueId` should be restricted:

* Either disallow if account has transactions
* Or allow but requires explicit confirmation

**MVP:** disallow changing `valueId` if transactions exist (409 Conflict).

### Delete Account

`DELETE /ledger/accounts/:id`
Rules:

* Block deletion if account has any transactions: `409 Conflict`
* Message: `"Cannot delete account with existing transactions."`

---

## 2.2 Transactions

### Create Transaction

`POST /ledger/transactions`
Body:

```json
{
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 2500,
  "timestamp": "2026-01-21T10:00:00.000Z",
  "verified": false,
  "note": "Coaching invoice paid"
}
```

Validation:

* fromAccount != toAccount
* amount != 0
* timestamp required (default now)

On create:

* persist transaction
* update balances of both accounts atomically (DB transaction)

### List Transactions

`GET /ledger/transactions`
Query params:

* `accountId` (shows any tx where from=accountId OR to=accountId)
* `fromAccountId`
* `toAccountId`
* `verified` (true/false)
* `dateFrom`, `dateTo`
* `minAmount`, `maxAmount`
* `q` (search in note)
* `page`, `pageSize`
* `sort` (timestamp_desc default)

Returns:

```json
{
  "data": [
    {
      "id": "...",
      "fromAccountId": "...",
      "toAccountId": "...",
      "amount": 2500,
      "timestamp": "...",
      "verified": false,
      "note": "...",
      "fromAccount": { "id": "...", "name": "..." },
      "toAccount": { "id": "...", "name": "..." }
    }
  ],
  "total": 123
}
```

### Update Transaction

`PATCH /ledger/transactions/:id`
Body can include:

* `amount`
* `timestamp`
* `verified`
* `note`
* `fromAccountId`
* `toAccountId`

Balance handling:

* If any of (amount/from/to) changes, balances must be adjusted correctly:

  * reverse old transaction effect
  * apply new transaction effect
  * all in a DB transaction

### Verify/Unverify Transaction (convenience)

`POST /ledger/transactions/:id/verify`
Body:

```json
{ "verified": true }
```

### Delete Transaction

`DELETE /ledger/transactions/:id`
Behavior:

* remove transaction
* reverse its effect on balances (atomic)

---

## 2.3 Balance Recalculation (admin/dev)

`POST /ledger/recalculate-balances`

* Recompute balances from all transactions (useful for safety)
  Returns:

```json
{ "recalculatedAccounts": 42 }
```

---

# 3) Business Rules & Edge Cases

## 3.1 Cross-Value Transactions

Question: Can you transfer between accounts with different `valueId`?

Example:

* PLN Cash (Value=PLN)
* Marketlum Coaching for XYZ Inc. (Value=Service)

This is conceptually an “exchange” and might be allowed, but it mixes units.

**Default MVP rule (recommended):**

* Allow transactions only between accounts referencing the **same Value**.
* Otherwise return `400 Bad Request`:
  `"Cannot transact between accounts of different Value."`

**Alternative (advanced):**

* Allow cross-value transactions but require two amounts and an exchange rate.
  (Not in MVP.)

---

## 3.2 Negative Amounts

Allowed. Must not break balance updates.

Validation:

* amount can be any non-zero number (positive or negative)
* store as decimal (avoid float drift)

---

## 3.3 Decimal Precision

Use decimal-safe type in DB:

* Postgres: `numeric(20, 6)` or similar
* Avoid JS float for money; represent as string or decimal library in backend

**MVP approach:**

* store amount and balance as string in API OR number with careful rounding
  Recommended: use `numeric` in DB and return as string.

---

# 4) Frontend Requirements (React)

## 4.1 Ledger Page: `/ledger`

Layout:

* Tabs or sections:

  * **Accounts**
  * **Transactions**

Top-level actions:

* `+ New Account`
* `+ New Transaction`

---

## 4.2 Accounts View

Table/list of accounts showing:

* Name
* Owner Agent
* Value
* Balance
* Description (optional)
* Actions: View / Edit / Delete

Account detail view:

* Account summary
* Recent transactions list (last 20)
* Quick action: “New transaction from this account”

---

## 4.3 Transactions View

Table showing:

* Timestamp
* From Account
* To Account
* Amount
* Verified badge
* Note
* Actions: Edit / Delete / Toggle Verified

Filters:

* Account (any)
* Verified status
* Date range
* Search note
* Amount range

UX details:

* Use color or arrows to show direction (From → To)
* On account detail, show amounts as inflow/outflow relative to the selected account:

  * If account is fromAccount → “outflow”
  * If account is toAccount → “inflow”

---

# 5) Seed Data

## 5.1 Required Seed Values (existing Value module)

Assume these Values exist or create them:

* Product: `PLN`
* Product: `EUR`
* Service: `Marketlum Coaching`
* Service: `Software Development`

## 5.2 Required Seed Agents (existing Agent module)

* Organization: `Marketlum`
* Organization: `XYZ Inc.`
* Individual: `Paweł`

## 5.3 Seed Accounts

1. `Marketlum PLN` (owner: Marketlum, value: PLN)
2. `Marketlum EUR` (owner: Marketlum, value: EUR)
3. `Coaching for XYZ Inc.` (owner: Marketlum, value: Marketlum Coaching)
4. `XYZ Inc. PLN` (owner: XYZ Inc., value: PLN)

## 5.4 Seed Transactions

* T1: XYZ Inc. PLN → Marketlum PLN, amount `5000`, verified `true`, note `Coaching payment`, timestamp last month
* T2: Marketlum PLN → Marketlum PLN, amount `-200` (example negative), verified `false`, note `Correction entry`, timestamp last week
* T3: Marketlum PLN → Marketlum PLN, amount `100`, verified `true`, note `Manual adjustment`, timestamp yesterday

**Note:** If enforcing “same Value only”, avoid cross-value transactions in seed.

Seed endpoint:
`POST /ledger/seed`

Idempotency:

* seed should not duplicate accounts/transactions if rerun

---

# 6) Permissions (MVP)

Assume authenticated single-tenant user can manage everything.
Later: restrict by Agent ownership.

---

# 7) Testing Requirements

## Backend tests

* create account
* create transaction updates balances correctly
* negative amount works as expected
* update transaction adjusts balances correctly
* delete transaction reverses balances
* cannot delete account with transactions
* cannot transact across different Value (if enforced)
* stats sanity: account balances match sum of transactions

## Frontend tests (smoke)

* create account
* create transaction
* verify toggle
* list filtering works

---

# 8) Acceptance Criteria

* User can create Accounts linked to a single Value and owned by an Agent.
* User can create Transactions moving an amount between two Accounts.
* Amount supports positive and negative values.
* Transactions can be verified/unverified.
* Accounts display current balance and update correctly after transaction changes.
* Seed data creates a realistic starting ledger with accounts + transactions.

---

# Additional details (to confirm before implementation)

1. **Cross-value transactions**: should not be allowed in MVP, From/To accounts must reference the same Value?
2. **unverified** transactions affect balance
3. we support **multi-currency precision** (e.g., PLN 2 decimals, BTC 8 decimals)