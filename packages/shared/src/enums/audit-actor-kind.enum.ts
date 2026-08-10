/** Who caused an audited action (spec 026). */
export enum AuditActorKind {
  HUMAN = 'human',
  AGENT = 'agent',
  /** No request context: seeders, CLI commands, migrations. */
  SYSTEM = 'system',
}
