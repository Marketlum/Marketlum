import type { MarketlumWebPlugin } from '@marketlum/ui';
import { nbpWebPlugin } from '@marketlum/plugin-nbp/web';
import { rdhyWebPlugin } from '@marketlum/plugin-rdhy/web';

/**
 * Active web plugins for this app — the frontend mirror of apps/api/src/plugins.ts.
 * Imported only by client code (it carries React components and icons).
 */
export const webPlugins: MarketlumWebPlugin[] = [nbpWebPlugin, rdhyWebPlugin];
