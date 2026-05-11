---
sidebar_position: 6
---

# Extending the API

`apps/api` is your own NestJS app. It imports `MarketlumCoreModule` for all built-in functionality, but you can register additional modules alongside it for custom endpoints, background jobs, webhooks, and integrations.

## Add a new module

The scaffold&apos;s `apps/api/src/app.module.ts` looks like this:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    MarketlumCoreModule,
  ],
})
export class AppModule {}
```

To add a custom feature, create a NestJS module and import it. For example, a webhook endpoint that fires when an invoice is paid:

```ts title="apps/api/src/webhooks/webhooks.module.ts"
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
```

```ts title="apps/api/src/app.module.ts"
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    MarketlumCoreModule,
    WebhooksModule,
  ],
})
export class AppModule {}
```

## Inject core services

Any service exported from `@marketlum/core` can be injected into your own providers. The core module is global, so you don&apos;t need to re-import it.

```ts title="apps/api/src/webhooks/webhooks.service.ts"
import { Injectable } from '@nestjs/common';
import { InvoicesService } from '@marketlum/core';

@Injectable()
export class WebhooksService {
  constructor(private readonly invoices: InvoicesService) {}

  async onInvoicePaid(invoiceId: string) {
    const invoice = await this.invoices.findOne(invoiceId);
    // forward to Stripe, Slack, etc.
  }
}
```

See the [Project Structure](/getting-started/project-structure) page for the list of exported services.

## Add custom entities

You can register your own TypeORM entities without touching core:

```ts title="apps/api/src/webhooks/webhook-event.entity.ts"
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  type!: string;

  @Column('jsonb')
  payload!: Record<string, unknown>;
}
```

Add it to `apps/api/src/data-source.ts` alongside the core entities:

```ts
import { ALL_ENTITIES, ALL_MIGRATIONS } from '@marketlum/core';
import { WebhookEvent } from './webhooks/webhook-event.entity';

export default new DataSource({
  // ...
  entities: [...ALL_ENTITIES, WebhookEvent],
  migrations: [...ALL_MIGRATIONS, /* your migrations */],
});
```

Generate a migration for the new table:

```bash
pnpm --filter @my/api typeorm migration:generate src/migrations/AddWebhookEvents -d src/data-source.ts
```

Reference your custom entity via `TypeOrmModule.forFeature([WebhookEvent])` in your module&apos;s imports.

## Background jobs

For scheduled work, install `@nestjs/schedule`:

```ts title="apps/api/src/jobs/jobs.module.ts"
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderJob } from './reminder.job';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ReminderJob],
})
export class JobsModule {}
```

```ts title="apps/api/src/jobs/reminder.job.ts"
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgreementsService } from '@marketlum/core';

@Injectable()
export class ReminderJob {
  constructor(private readonly agreements: AgreementsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendExpiryReminders() {
    // ...
  }
}
```

## Don&apos;t modify core

If you find yourself wanting to change how a core service behaves, prefer one of:

1. **Compose around it** &mdash; call the core service from your own service and add behavior before/after.
2. **Replace a provider** &mdash; if core exposes a DI token (e.g. `STORAGE_PROVIDER`), bind your own implementation in `app.module.ts`.
3. **Open an issue** &mdash; if neither works, the framework is missing an extension point. That&apos;s worth reporting.

Forking `@marketlum/core` is always an option but it forfeits the upgrade path.
