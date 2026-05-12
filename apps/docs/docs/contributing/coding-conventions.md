---
sidebar_position: 6
---

# Coding Conventions

The rules and gotchas worth knowing before opening your first PR.

## TypeScript

- Strict mode is on across the monorepo (`tsconfig.base.json`).
- `apps/api` keeps `strictPropertyInitialization: false` because TypeORM entity fields are populated at runtime.
- Prefer `import type` for types-only imports.

## Validation: Zod in `@marketlum/shared` is the source of truth

Every endpoint takes a DTO whose shape comes from a Zod schema in `@marketlum/shared`. Controllers use `ZodValidationPipe` (or the `nestjs-zod` pattern) to validate request bodies and queries.

```ts
import { CreateWidgetSchema } from '@marketlum/shared';

@Post()
@UsePipes(new ZodValidationPipe(CreateWidgetSchema))
create(@Body() body: z.infer<typeof CreateWidgetSchema>) { /* ... */ }
```

When a schema changes:

1. Update it in `packages/shared/src/<domain>.ts`.
2. Rebuild: `pnpm --filter @marketlum/shared run build`.
3. The API and web consumers pick up the new types automatically.

Don&apos;t duplicate the shape with class-validator decorators &mdash; Zod is canonical.

## Template synchronization

Whenever you change `apps/api/` or `apps/web/`, check whether the corresponding file in `packages/create-marketlum-app/template/` needs the same change. The template **must** stay in lockstep with the reference apps so `npx create-marketlum-app` scaffolds a working project.

Things that almost always need to be mirrored:
- `app.module.ts`, `cli.module.ts` imports
- `package.json` scripts and dependency versions (template files end in `.tmpl`)
- Tailwind / Next / Nest config files
- `data-source.ts`, `main.ts`, `middleware.ts`

Files in `template/` may use `.tmpl` extension when they contain variables like `{{DATABASE_NAME}}` that get substituted at scaffold time.

## TypeORM

### Decimal columns

Postgres `numeric` / `decimal` values come back as strings. Always format them as:

```ts
Number(rawValue).toFixed(2)
```

**Not** `String(rawValue)` or `parseFloat(rawValue).toString()` &mdash; JS number conversion strips trailing zeros (`"100.50"` becomes `"100.5"`, `"0.00"` becomes `"0"`), which breaks money formatting and audit reporting.

### Cascade pitfalls with OneToMany

When transforming a join entity into a flat object for the API response, **delete the relation property before calling `.save()`** &mdash; otherwise TypeORM cascade-inserts malformed rows. Pattern:

```ts
const raw = await this.repo.findOneRaw(id);     // internal shape, has relations
const flat = { ...raw, computedField };
delete flat.relations;                          // before saving!
return this.repo.save(flat);
```

Maintain a `findOneRaw()` (with relations, internal use) and a `findOne()` (flattened, API response).

### Computed balances

For list endpoints, use `addSelect` with a subquery on `getRawAndEntities()`. For single-entity endpoints, raw SQL is fine. Don&apos;t compute in JS by iterating &mdash; it doesn&apos;t scale.

### `tsvector` search columns

`search_vector` columns are populated by database triggers. **Do not** add `@Column()` mapping for them in the entity &mdash; TypeORM will try to read them as `searchVector` and throw &quot;column searchVector does not exist.&quot;

### Closure tables

If you use `@TreeLevelColumn()` with a closure table, both the entity column and the closure table&apos;s `level` column need `DEFAULT 0` in the migration. TypeORM doesn&apos;t populate `level` on insert.

## NestJS

### Throttling

Use the Record syntax with `@nestjs/throttler` v6:

```ts
@Throttle({ default: { ttl: 60000, limit: 10 } })   // correct
@Throttle([{ name: 'default', ttl: 60000, limit: 10 }])   // wrong (v5 syntax)
```

### File upload

```ts
@Post()
@UseInterceptors(FileInterceptor('file'))
upload(@UploadedFile(ParseFilePipe) file: Express.Multer.File) { /* ... */ }
```

Multer uses memory storage by default (configured in `FilesModule`). The buffer is on `file.buffer`.

## React / Next.js

### shadcn/ui missing components

Not every shadcn component is installed. If you need one that isn&apos;t there (e.g. `Checkbox`), either install it (`npx shadcn-ui@latest add checkbox`) or use the native `<input type="checkbox">`.

## Imports that bit people

- `import request from 'supertest'` &mdash; v7 default export, not `* as request`.
- `import cookieParser from 'cookie-parser'` &mdash; v1.4.7+ default export.

## Comments and docs in code

Default to writing no comments. Add one only when the *why* is non-obvious &mdash; a workaround for a specific bug, a subtle invariant, an external constraint. Don&apos;t comment the *what*; names already do that.

Never write multi-paragraph docstrings or explanatory blocks. If a function needs paragraphs to explain, split it or rename it.

## Migrations

Migrations have their own page. See [Database Migrations](/contributing/migrations).
