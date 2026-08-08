import { toSnakeCase } from '../plugins/snake-case';
import type { EntityClass } from '../plugins/marketlum-api-plugin';

/**
 * Registry mapping a plugin's primary entity classes to their event base
 * `plugin.<id>.<entity_snake>`. Populated by PluginsModule.forRoot() at boot and
 * consulted by the DomainEventSubscriber so plugin entities emit
 * `marketlum.plugin.<id>.<entity_snake>.<verb>` alongside core events.
 */
const registry = new Map<EntityClass, string>();

export function registerPluginPrimaryEntities(pluginId: string, entities: EntityClass[]): void {
  for (const entity of entities) {
    registry.set(entity, `plugin.${pluginId}.${toSnakeCase(entity.name)}`);
  }
}

export function pluginPrimaryEntityBase(target: EntityClass): string | undefined {
  return registry.get(target);
}
