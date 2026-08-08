import {
  PLUGIN_EVENT_GLOB,
  pluginEventName,
  pluginSettingsKey,
  pluginSettingsKeyPrefix,
  pluginTablePrefix,
} from './namespace';

describe('plugin namespace helpers', () => {
  it('builds the table prefix from the plugin id', () => {
    expect(pluginTablePrefix('nbp')).toBe('plugin_nbp_');
  });

  it('converts hyphens to underscores in table prefixes', () => {
    expect(pluginTablePrefix('my-plugin')).toBe('plugin_my_plugin_');
  });

  it('builds the settings key prefix', () => {
    expect(pluginSettingsKeyPrefix('nbp')).toBe('plugin.nbp.');
  });

  it('builds a namespaced settings key', () => {
    expect(pluginSettingsKey('nbp', 'config')).toBe('plugin.nbp.config');
  });

  it('builds a namespaced domain-event name', () => {
    expect(pluginEventName('nbp', 'widget', 'created')).toBe(
      'marketlum.plugin.nbp.widget.created',
    );
  });

  it('exposes a glob that covers every plugin event', () => {
    expect(PLUGIN_EVENT_GLOB).toBe('marketlum.plugin.**');
  });
});
