import { z } from 'zod';
import type { MarketlumApiPlugin } from '@marketlum/core';
import { ExampleModule } from './example.module';
import { Widget } from './widget.entity';
import { CreateExampleWidgets1700000000900 } from './example.migration';

export const exampleSettingsSchema = z.object({
  label: z.string(),
  enabled: z.boolean(),
});

export const exampleSettingsDefaults = { label: 'Example', enabled: false };

/**
 * Minimal in-test plugin exercising every backend capability: a namespaced
 * entity + migration, a mounted controller, a settings contract, and a primary
 * entity that emits marketlum.plugin.example.widget.* events.
 */
export const examplePlugin: MarketlumApiPlugin = {
  manifest: {
    id: 'example',
    name: 'Example Plugin',
    version: '0.0.1',
    marketlumCoreVersion: '*',
  },
  module: ExampleModule,
  entities: [Widget],
  migrations: [CreateExampleWidgets1700000000900],
  primaryEntities: [Widget],
  settings: {
    schema: exampleSettingsSchema,
    defaults: exampleSettingsDefaults,
  },
  permissionResources: ['example.ping', 'example.widgets'],
};
