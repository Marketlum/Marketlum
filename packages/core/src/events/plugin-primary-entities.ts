import { toSnakeCase } from '../plugins/snake-case';

/**
 * Registry mapping a plugin's primary entity classes to their event base
 * `plugin.<id>.<entity_snake>`. Populated by PluginsModule.forRoot() at boot and
 * consulted by the DomainEventSubscriber so plugin entities emit
 * `marketlum.plugin.<id>.<entity_snake>.<verb>` alongside core events.
 */
const registry = new Map<Function, string>();

export function registerPluginPrimaryEntities(pluginId: string, entities: Function[]): void {
  for (const entity of entities) {
    registry.set(entity, `plugin.${pluginId}.${toSnakeCase(entity.name)}`);
  }
}

export function pluginPrimaryEntityBase(target: Function): string | undefined {
  return registry.get(target);
}
