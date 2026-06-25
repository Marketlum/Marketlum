/**
 * Namespace helpers shared by the backend (core) and the registration guards.
 * Every artefact a plugin owns is prefixed with its id so plugins can never
 * collide with core or with one another.
 */

/** Table prefix for a plugin's entities, e.g. "plugin_nbp_". Hyphens become underscores. */
export const pluginTablePrefix = (id: string): string => `plugin_${id.replace(/-/g, '_')}_`;

/** Settings-key prefix for a plugin, e.g. "plugin.nbp." */
export const pluginSettingsKeyPrefix = (id: string): string => `plugin.${id}.`;

/** A namespaced settings key, e.g. pluginSettingsKey("nbp", "config") => "plugin.nbp.config". */
export const pluginSettingsKey = (id: string, key: string): string =>
  `${pluginSettingsKeyPrefix(id)}${key}`;

/** A namespaced domain-event name, e.g. "marketlum.plugin.nbp.widget.created". */
export const pluginEventName = (id: string, entitySnake: string, verb: string): string =>
  `marketlum.plugin.${id}.${entitySnake}.${verb}`;

/** Wildcard that matches every plugin event. */
export const PLUGIN_EVENT_GLOB = 'marketlum.plugin.**';
