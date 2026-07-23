import type { Type } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { PluginManifest, PluginSettingsContract } from '@marketlum/shared';

export type EntityClass = Function;
export type MigrationClass = Function;

/**
 * The backend half of a Marketlum plugin. The downstream app passes an array of
 * these to `MarketlumCoreModule.forRoot({ plugins })`; core aggregates each
 * plugin's module, entities, migrations and event configuration at boot.
 */
export interface MarketlumApiPlugin {
  manifest: PluginManifest;

  /** Nest feature module, added to MarketlumCoreModule's imports. */
  module: Type<unknown>;

  /** TypeORM entities owned by the plugin. Table names MUST start with plugin_<id>_. */
  entities?: EntityClass[];

  /** Hand-written migrations owned by the plugin, run after core's in timestamp order. */
  migrations?: MigrationClass[];

  /**
   * Entity classes whose CRUD should emit
   * `marketlum.plugin.<id>.<entity_snake>.<verb>` domain events.
   */
  primaryEntities?: EntityClass[];

  /** Settings contract; surfaced in the admin UI and read via PluginSettingsService. */
  settings?: PluginSettingsContract;

  /**
   * Permission resources this plugin's routes are gated by (spec 020), e.g.
   * "rdhy.vam-agreements" for `/plugins/rdhy/vam-agreements`. Grants naming
   * these resources validate in RolesService alongside PERMISSION_RESOURCES.
   */
  permissionResources?: string[];

  /** Optional sample-data hook, invoked by `pnpm seed:sample` when the plugin is active. */
  seed?: (dataSource: DataSource) => Promise<void>;
}

/** Options accepted by MarketlumCoreModule.forRoot(). */
export interface MarketlumCoreOptions {
  plugins?: MarketlumApiPlugin[];
}
