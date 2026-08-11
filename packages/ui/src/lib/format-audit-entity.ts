/**
 * Display label for an audit entityType (spec 026 follow-up). Plugin entities
 * arrive as `plugin.<id>.<table_snake>` where the snake name repeats the
 * plugin prefix (table-prefix rule), e.g. `plugin.rdhy.rdhy_emc_agreement`.
 * Rendered raw that reads as noise — show `rdhy · emc_agreement` instead.
 * Core entity types pass through unchanged.
 */
export function formatAuditEntityType(entityType: string): string {
  const match = entityType.match(/^plugin\.([a-z0-9-]+)\.(.+)$/);
  if (!match) return entityType;
  const [, pluginId, entity] = match;
  const snakePrefix = `${pluginId.replace(/-/g, '_')}_`;
  const trimmed = entity.startsWith(snakePrefix) ? entity.slice(snakePrefix.length) : entity;
  return `${pluginId} · ${trimmed}`;
}
