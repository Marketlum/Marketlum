/** Convert a PascalCase/camelCase class name to snake_case: Widget -> widget,
 * EmcAgreement -> emc_agreement, MicroEnterprise -> micro_enterprise. */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
