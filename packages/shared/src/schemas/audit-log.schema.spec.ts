import { auditLogsQuerySchema } from './audit-log.schema';

describe('auditLogsQuerySchema (spec 026)', () => {
  it('accepts an empty query', () => {
    expect(auditLogsQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts all filters together', () => {
    const parsed = auditLogsQuerySchema.parse({
      actorKind: 'agent',
      category: 'mcp_call',
      userId: '2e9b1a30-0000-4000-8000-000000000001',
      entityType: 'actor',
      entityId: '2e9b1a30-0000-4000-8000-000000000002',
      from: '2026-01-01',
      to: '2026-02-01',
    });
    expect(parsed.from).toBeInstanceOf(Date);
    expect(parsed.to).toBeInstanceOf(Date);
  });

  it.each<[Record<string, unknown>, string]>([
    [{ actorKind: 'robot' }, 'unknown actor kind'],
    [{ category: 'reads' }, 'unknown category'],
    [{ userId: 'not-a-uuid' }, 'malformed userId'],
    [{ from: 'not-a-date' }, 'malformed from date'],
  ])('rejects %j (%s)', (query, _reason) => {
    expect(auditLogsQuerySchema.safeParse(query).success).toBe(false);
  });
});
