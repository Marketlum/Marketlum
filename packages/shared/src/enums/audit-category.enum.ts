/** The class of platform activity an audit entry records (spec 026). */
export enum AuditCategory {
  /** A persisted domain event: an entity was created/updated/deleted. */
  MUTATION = 'mutation',
  /** An MCP tools/call invocation (read-only tools; agent activity). */
  MCP_CALL = 'mcp_call',
  /** Login success/failure or logout. */
  AUTH = 'auth',
}
