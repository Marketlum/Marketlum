import type { MarketlumApiPlugin } from '@marketlum/core';

/**
 * Active plugins for this app. Add `@marketlum/plugin-*` backend entries here;
 * they contribute modules, entities, migrations, events and settings via
 * MarketlumCoreModule.forRoot({ plugins }).
 */
export const plugins: MarketlumApiPlugin[] = [];
