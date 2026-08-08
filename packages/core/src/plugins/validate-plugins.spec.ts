import type { Type } from '@nestjs/common';
import type { PluginManifest } from '@marketlum/shared';
import { MarketlumApiPlugin } from './marketlum-api-plugin';
import { RESERVED_PLUGIN_IDS, validatePlugins } from './validate-plugins';
import { MARKETLUM_CORE_VERSION } from './version-compat';

class DummyModule {}

function makePlugin(
  manifest: Partial<PluginManifest> = {},
  rest: Partial<MarketlumApiPlugin> = {},
): MarketlumApiPlugin {
  return {
    manifest: {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      marketlumCoreVersion: '*',
      ...manifest,
    },
    module: DummyModule as Type<unknown>,
    ...rest,
  };
}

describe('validatePlugins', () => {
  it('accepts a minimal valid plugin', () => {
    expect(() => validatePlugins([makePlugin()])).not.toThrow();
  });

  it('accepts a plugin pinned to the current core version', () => {
    const plugin = makePlugin({ marketlumCoreVersion: `^${MARKETLUM_CORE_VERSION}` });
    expect(() => validatePlugins([plugin])).not.toThrow();
  });

  it.each(['Bad_ID', 'UPPER', '1abc', 'a', ''])(
    'rejects the malformed plugin id "%s"',
    (id) => {
      expect(() => validatePlugins([makePlugin({ id })])).toThrow(/kebab-case/);
    },
  );

  it('rejects a plugin id that collides with a core name', () => {
    expect(() => validatePlugins([makePlugin({ id: 'auth' })])).toThrow(/Reserved/);
  });

  it('reserves every core route segment', () => {
    for (const id of ['actors', 'invoices', 'plugins', 'events']) {
      expect(RESERVED_PLUGIN_IDS.has(id)).toBe(true);
    }
  });

  it('rejects duplicate plugin ids', () => {
    expect(() => validatePlugins([makePlugin(), makePlugin()])).toThrow(/Duplicate/);
  });

  it('rejects a plugin requiring an incompatible core version', () => {
    const plugin = makePlugin({ marketlumCoreVersion: '^99.0.0' });
    expect(() => validatePlugins([plugin])).toThrow(/incompatible core version/);
  });

  it('rejects an entity whose table name lacks the plugin prefix', () => {
    class Widget {}
    const plugin = makePlugin({}, { entities: [Widget] });
    expect(() => validatePlugins([plugin])).toThrow(/must start with the required table prefix/);
  });

  it('accepts an entity whose table name carries the plugin prefix', () => {
    // Undecorated class: the table name falls back to toSnakeCase(class name).
    class PluginTestPluginWidget {}
    const plugin = makePlugin({}, { entities: [PluginTestPluginWidget] });
    expect(() => validatePlugins([plugin])).not.toThrow();
  });

  it('derives the table prefix with hyphens converted to underscores', () => {
    class PluginMyExtWidget {}
    const plugin = makePlugin({ id: 'my-ext' }, { entities: [PluginMyExtWidget] });
    expect(() => validatePlugins([plugin])).not.toThrow();
  });
});
