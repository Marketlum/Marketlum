import { getMetadataArgsStorage } from 'typeorm';
import { pluginIdSchema, pluginTablePrefix } from '@marketlum/shared';
import { MarketlumApiPlugin } from './marketlum-api-plugin';
import { toSnakeCase } from './snake-case';
import { MARKETLUM_CORE_VERSION, satisfiesCoreVersion } from './version-compat';

/** Plugin ids that would shadow a core route segment or concept. */
export const RESERVED_PLUGIN_IDS = new Set<string>([
  'auth', 'users', 'user', 'agents', 'agent', 'values', 'value',
  'value-instances', 'taxonomies', 'files', 'perspectives', 'value-streams',
  'search', 'ledger', 'agreements', 'channels', 'offerings', 'invoices',
  'pipelines', 'tensions', 'exchanges', 'exchange-rates', 'dashboard',
  'geographies', 'archetypes', 'locales', 'agreement-templates',
  'system-settings', 'ai', 'geocoding', 'events', 'plugins',
]);

/**
 * Runs while MarketlumCoreModule.forRoot() builds its dynamic module, so a
 * misconfigured plugin fails fast at boot rather than corrupting the schema or
 * the namespace. Throws on the first problem found.
 */
export function validatePlugins(plugins: MarketlumApiPlugin[]): void {
  const seen = new Set<string>();

  for (const plugin of plugins) {
    const id = plugin.manifest?.id;

    const idCheck = pluginIdSchema.safeParse(id);
    if (!idCheck.success) {
      throw new Error(`Invalid plugin id "${id}": must be kebab-case (a-z, 0-9, -).`);
    }
    if (RESERVED_PLUGIN_IDS.has(id)) {
      throw new Error(`Reserved plugin id "${id}" collides with a core name.`);
    }
    if (seen.has(id)) {
      throw new Error(`Duplicate plugin id "${id}".`);
    }
    seen.add(id);

    if (!satisfiesCoreVersion(MARKETLUM_CORE_VERSION, plugin.manifest.marketlumCoreVersion)) {
      throw new Error(
        `Plugin "${id}" requires an incompatible core version: needs "${plugin.manifest.marketlumCoreVersion}", but @marketlum/core is "${MARKETLUM_CORE_VERSION}".`,
      );
    }

    const prefix = pluginTablePrefix(id);
    for (const entity of plugin.entities ?? []) {
      const tableArg = getMetadataArgsStorage().tables.find((t) => t.target === entity);
      const tableName = tableArg?.name ?? toSnakeCase((entity as Function).name);
      if (!tableName.startsWith(prefix)) {
        throw new Error(
          `Plugin "${id}" entity table "${tableName}" must start with the required table prefix "${prefix}".`,
        );
      }
    }
  }
}
