---
sidebar_position: 7
---

# Database Migrations

Migrations live in `packages/core/src/migrations/` and are applied by TypeORM. They are part of the framework&apos;s public contract: when a user runs `pnpm migration:run` after upgrading `@marketlum/core`, the schema must converge cleanly.

## When to write a migration

Any time you add, remove, or change:

- An entity column (type, nullability, default)
- A table
- An index, foreign key, or constraint
- An enum (Postgres enums need explicit `ALTER TYPE`)
- A trigger or function (e.g. `search_vector` updates)

Pure code-level changes (adding a method to a service, refactoring a controller) don&apos;t need a migration.

## Generating vs. writing by hand

```bash
pnpm migration:generate src/migrations/MyChange
```

This diffs the current entities against the dev database and writes a migration. **Read the output carefully** before committing &mdash; `migration:generate` often includes drift artifacts from earlier hand-edited migrations (e.g. enum renames that look unrelated to your change).

For clean, reviewable migrations, prefer to **write them manually**. Use `generate` to discover what SQL is needed, then rewrite the migration as a focused, minimal diff.

## Migration file structure

```ts title="packages/core/src/migrations/1730000000000-AddWidgets.ts"
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWidgets1730000000000 implements MigrationInterface {
  name = 'AddWidgets1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "widgets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "widgets"`);
  }
}
```

The timestamp prefix orders migrations. Use the current Unix-millisecond timestamp.

## Registering a migration

Migrations are auto-discovered through `ALL_MIGRATIONS` exported from `packages/core/src/migrations/index.ts`. Add your new file there:

```ts title="packages/core/src/migrations/index.ts"
import { AddWidgets1730000000000 } from './1730000000000-AddWidgets';

export const ALL_MIGRATIONS = [
  // ... existing
  AddWidgets1730000000000,
];
```

Order matters: list them chronologically.

## Reversibility

Every `up` needs a `down` that fully reverses it. The release process and many test workflows rely on `migration:revert` working. If a migration is genuinely irreversible (e.g. dropping a column with data), say so in the PR description.

## Testing your migration

```bash
# Apply to dev DB
pnpm migration:run

# Verify it reverts cleanly
pnpm migration:revert
pnpm migration:run

# Verify the test suite still passes
pnpm test:e2e
```

The test setup (`apps/api/test/setup.ts`) runs all migrations on the test DB before any scenarios. So if your migration breaks anything, the suite will surface it.

## Closure tables

For tree entities using TypeORM closure tables and `@TreeLevelColumn()`:

- The entity column needs `DEFAULT 0`.
- The closure table&apos;s `level` column **also** needs `DEFAULT 0`.

TypeORM doesn&apos;t populate `level` on insert, so without the default you get a NOT NULL violation.

## Postgres enums

Renaming an enum value is verbose:

```sql
ALTER TYPE "widget_status_enum" RENAME VALUE 'old' TO 'new';
```

Adding requires `ALTER TYPE ... ADD VALUE`. Removing requires creating a new type, migrating columns, and dropping the old one. Plan migrations on enums carefully &mdash; downtime is easy to incur if you&apos;re not transactional.

## `tsvector` columns

`search_vector` columns are maintained by Postgres triggers, not application code. When adding a searchable column, you typically:

1. Add the column with `tsvector` type.
2. Create a trigger that updates it on INSERT/UPDATE.
3. Backfill existing rows in the same migration.

Don&apos;t map the column in the TypeORM entity (see [Coding Conventions](/contributing/coding-conventions#tsvector-search-columns)).
