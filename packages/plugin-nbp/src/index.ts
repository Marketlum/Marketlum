import type { MarketlumApiPlugin } from '@marketlum/core';
import { NbpModule } from './nbp.module';
import { nbpSettingsSchema, nbpSettingsDefaults, NBP_PLUGIN_ID } from './shared/settings';

/** The NBP plugin: ingests Narodowy Bank Polski table A rates into core's
 * exchange_rates. Backend + settings only — owns no tables. */
export const nbpPlugin: MarketlumApiPlugin = {
  manifest: {
    id: NBP_PLUGIN_ID,
    name: 'Narodowy Bank Polski',
    version: '0.1.0',
    marketlumCoreVersion: '^0.4.0',
  },
  module: NbpModule,
  settings: {
    schema: nbpSettingsSchema,
    defaults: nbpSettingsDefaults,
  },
  permissionResources: ['nbp.refresh'],
};

export { NbpModule } from './nbp.module';
export { NbpService, type NbpSyncSummary } from './nbp.service';
export { NbpClient, type NbpTableA, type NbpRate } from './nbp.client';
export * from './shared/settings';
