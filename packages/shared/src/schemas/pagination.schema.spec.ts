import { paginationQuerySchema } from './pagination.schema';

describe('paginationQuerySchema', () => {
  it('applies defaults to an empty query', () => {
    expect(paginationQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortOrder: 'ASC',
    });
  });

  it('coerces numeric strings, as delivered by query params', () => {
    const parsed = paginationQuerySchema.parse({ page: '3', limit: '25' });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(25);
  });

  it('passes through search and sortBy', () => {
    const parsed = paginationQuerySchema.parse({ search: 'acme', sortBy: 'name' });
    expect(parsed.search).toBe('acme');
    expect(parsed.sortBy).toBe('name');
  });

  it.each<[Record<string, unknown>, string]>([
    [{ page: 0 }, 'page must be positive'],
    [{ page: -1 }, 'page must be positive'],
    [{ page: 1.5 }, 'page must be an integer'],
    [{ limit: 0 }, 'limit must be positive'],
    [{ limit: 10001 }, 'limit is capped at 10000'],
    [{ sortOrder: 'up' }, 'sortOrder must be ASC or DESC'],
  ])('rejects %j (%s)', (query, _reason) => {
    expect(paginationQuerySchema.safeParse(query).success).toBe(false);
  });

  it('accepts the limit cap exactly', () => {
    expect(paginationQuerySchema.parse({ limit: 10000 }).limit).toBe(10000);
  });
});
