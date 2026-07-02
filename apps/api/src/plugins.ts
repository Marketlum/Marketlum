import type { MarketlumApiPlugin } from '@marketlum/core';
import { nbpPlugin } from '@marketlum/plugin-nbp';
import { rdhyPlugin } from '@marketlum/plugin-rdhy';

/**
 * Active plugins for this deployment. Add `@marketlum/plugin-*` backend entries
 * here; they contribute modules, entities, migrations, events and settings to
 * the app via MarketlumCoreModule.forRoot({ plugins }).
 */
export const plugins: MarketlumApiPlugin[] = [nbpPlugin, rdhyPlugin];
