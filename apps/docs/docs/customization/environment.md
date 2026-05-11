---
sidebar_position: 4
---

# Environment & Configuration

All runtime configuration lives in a single `.env` file at the project root. The scaffold ships with an `.env.example`; copy it to `.env` and edit.

## Variables

### Database

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_HOST` | `localhost` | |
| `DATABASE_PORT` | `5432` | |
| `DATABASE_USERNAME` | (set at scaffold) | |
| `DATABASE_PASSWORD` | (set at scaffold) | |
| `DATABASE_NAME` | (set at scaffold) | |

These are read by both the API runtime (`MarketlumCoreModule`) and the TypeORM CLI (`data-source.ts`).

### Authentication

| Variable | Default | Notes |
|----------|---------|-------|
| `JWT_SECRET` | `change-me-in-production` | **Must** be changed before deploying |
| `JWT_EXPIRES_IN` | `1d` | Standard [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken#usage) duration |

### Ports and URLs

| Variable | Default | Notes |
|----------|---------|-------|
| `API_PORT` | `3001` | |
| `WEB_PORT` | `3000` | |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3000` | Used by API CORS allowlist |

### File storage

| Variable | Default | Notes |
|----------|---------|-------|
| `STORAGE_DRIVER` | `local` | Set to `s3` to use the S3 provider |
| `S3_BUCKET` | &mdash; | Required when `STORAGE_DRIVER=s3` |
| `S3_REGION` | &mdash; | |
| `AWS_ACCESS_KEY_ID` | &mdash; | Or use IAM role |
| `AWS_SECRET_ACCESS_KEY` | &mdash; | |

When `STORAGE_DRIVER` is unset or `local`, uploads land in `./uploads` at the project root.

## Custom storage provider

If you need a storage backend other than local disk or S3 (e.g. GCS, Azure Blob), implement the `StorageProvider` interface and bind it in your API module.

```ts title="apps/api/src/gcs-storage.provider.ts"
import { Readable } from 'stream';
import type { StorageProvider, StorageDownloadResult } from '@marketlum/core';

export class GcsStorageProvider implements StorageProvider {
  async upload(key: string, buffer: Buffer): Promise<void> { /* ... */ }
  async download(key: string): Promise<StorageDownloadResult> { /* ... */ }
  async delete(key: string): Promise<void> { /* ... */ }
}
```

```ts title="apps/api/src/app.module.ts"
import { MarketlumCoreModule, STORAGE_PROVIDER } from '@marketlum/core';
import { GcsStorageProvider } from './gcs-storage.provider';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }), MarketlumCoreModule],
  providers: [
    { provide: STORAGE_PROVIDER, useClass: GcsStorageProvider },
  ],
})
export class AppModule {}
```

NestJS&apos; last-binding-wins rule means your provider supersedes the one registered inside `MarketlumCoreModule`.

## Custom configuration

For values that aren&apos;t in `.env` (feature flags, third-party API keys), use NestJS&apos; `ConfigModule` and inject `ConfigService` into your own modules. Don&apos;t edit `@marketlum/core` to read new env vars &mdash; read them in your own code instead.
