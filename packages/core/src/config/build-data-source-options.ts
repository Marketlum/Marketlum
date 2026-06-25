import { DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from '../entities';
import { ALL_MIGRATIONS } from '../migrations';
import { MarketlumApiPlugin } from '../plugins/marketlum-api-plugin';

/**
 * Single aggregation path for the TypeORM data source, used by both the running
 * Nest app (via databaseConfig) and the migration CLI (apps/api/src/data-source.ts),
 * so core entities/migrations and plugin contributions are never duplicated.
 */
export function buildDataSourceOptions(
  plugins: MarketlumApiPlugin[] = [],
): DataSourceOptions {
  const pluginEntities = plugins.flatMap((p) => p.entities ?? []);
  const pluginMigrations = plugins.flatMap((p) => p.migrations ?? []);

  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'marketlum',
    password: process.env.DATABASE_PASSWORD || 'marketlum',
    database: process.env.DATABASE_NAME || 'marketlum',
    entities: [...ALL_ENTITIES, ...pluginEntities],
    migrations: [...ALL_MIGRATIONS, ...pluginMigrations],
    synchronize: false,
  } as DataSourceOptions;
}
