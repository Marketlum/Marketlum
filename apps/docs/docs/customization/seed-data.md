---
sidebar_position: 5
---

# Seed Data

Marketlum exposes two seed commands out of the box: `pnpm seed:admin` (creates the default admin user) and `pnpm seed:sample` (creates a realistic demo dataset). Add your own seed commands for fixture data, test users, or initial taxonomy structures.

## How seed commands wire in

Seed commands are [nest-commander](https://docs.nestjs.com/recipes/nest-commander) `CommandRunner` classes registered as providers in `apps/api/src/cli.module.ts`:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    MarketlumCoreModule,
  ],
  providers: [SeedAdminCommand, SeedSampleCommand],
})
export class CliModule {}
```

The CLI entry point (`apps/api/src/cli.ts`) bootstraps this module and dispatches by command name.

## Add a custom seed

Create a command in `apps/api/src`:

```ts title="apps/api/src/seed-test-users.command.ts"
import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { UsersService } from '@marketlum/core';

@Command({
  name: 'seed:test-users',
  description: 'Seed five test users',
})
export class SeedTestUsersCommand extends CommandRunner {
  private readonly logger = new Logger(SeedTestUsersCommand.name);

  constructor(private readonly users: UsersService) {
    super();
  }

  async run(): Promise<void> {
    for (let i = 1; i <= 5; i++) {
      await this.users.create({
        email: `tester${i}@example.com`,
        password: 'password123',
        name: `Tester ${i}`,
      });
    }
    this.logger.log('Seeded 5 test users');
  }
}
```

Register it as a provider:

```ts title="apps/api/src/cli.module.ts"
import { SeedTestUsersCommand } from './seed-test-users.command';

@Module({
  imports: [/* ... */],
  providers: [SeedAdminCommand, SeedSampleCommand, SeedTestUsersCommand],
})
export class CliModule {}
```

Add a script in the root `package.json`:

```json
{
  "scripts": {
    "seed:test-users": "pnpm --filter @my/api cli seed:test-users"
  }
}
```

Run it:

```bash
pnpm seed:test-users
```

## Available services

You can inject any service exported from `@marketlum/core`. Common ones for seeding:

| Service | Purpose |
|---------|---------|
| `UsersService` | Create users (hashes passwords) |
| `AgentsService` | Create organizations / people / virtual agents |
| `TaxonomiesService` | Create taxonomy trees |
| `LocalesService` | Add languages to the database |
| `GeographiesService` | Add country/region records |
| `ValueStreamsService`, `ValuesService`, &hellip; | Domain entities |

See the [Project Structure](/getting-started/project-structure) page for the full list of services.

## Idempotency

Make seeds safe to re-run. The built-in `SeedAdminCommand` catches `409 Conflict` (user already exists) and logs instead of throwing. Apply the same pattern in your own seeders so they can run on every deploy without failing.

## Reset before seeding

For development, the sample seeder supports a `--reset` flag that truncates relevant tables first:

```bash
pnpm seed:sample -- --reset
```

If you want the same behavior, add an `@Option()` to your command and gate the truncate calls on it. Never enable a flag like this in production by default.
