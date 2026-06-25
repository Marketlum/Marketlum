import { z } from 'zod';

/**
 * A plugin id is the namespace for everything the plugin contributes: its tables
 * (`plugin_<id>_*`), settings keys (`plugin.<id>.*`) and events
 * (`marketlum.plugin.<id>.*`). Kebab-case, 2–32 chars, starts with a letter.
 */
export const pluginIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,31}$/, 'plugin id must be kebab-case (a-z, 0-9, -) and start with a letter');

export interface PluginManifest {
  /** e.g. "nbp", "rdhy" */
  id: string;
  /** Human-readable label, e.g. "Narodowy Bank Polski" */
  name: string;
  /** The plugin package version (semver). */
  version: string;
  /** A semver RANGE of @marketlum/core this plugin supports, e.g. "^0.4.0". */
  marketlumCoreVersion: string;
}

/**
 * A plugin that exposes admin settings declares a Zod schema plus defaults. The
 * settings are persisted as a single JSON blob under `plugin.<id>.config` and
 * validated against the schema on every read and write.
 */
export interface PluginSettingsContract<T = unknown> {
  schema: z.ZodType<T>;
  defaults: T;
}
