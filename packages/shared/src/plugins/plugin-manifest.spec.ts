import { pluginIdSchema } from './plugin-manifest';

describe('pluginIdSchema', () => {
  it.each(['nbp', 'rdhy', 'my-plugin', 'plugin2', 'a-b-c', 'ab'])(
    'accepts "%s"',
    (id) => {
      expect(pluginIdSchema.safeParse(id).success).toBe(true);
    },
  );

  it.each([
    ['a', 'shorter than 2 chars'],
    ['a'.repeat(33), 'longer than 32 chars'],
    ['NBP', 'uppercase'],
    ['1abc', 'starts with a digit'],
    ['-abc', 'starts with a hyphen'],
    ['a_b', 'contains an underscore'],
    ['a.b', 'contains a dot'],
    ['', 'empty'],
  ])('rejects "%s" (%s)', (id) => {
    expect(pluginIdSchema.safeParse(id).success).toBe(false);
  });

  it('accepts a 32-char id (upper bound)', () => {
    expect(pluginIdSchema.safeParse('a'.repeat(32)).success).toBe(true);
  });
});
