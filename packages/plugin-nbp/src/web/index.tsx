import { RefreshCw } from 'lucide-react';
import type { MarketlumWebPlugin } from '@marketlum/ui';
import { nbpSettingsSchema } from '../shared/settings';
import { NbpSettings } from './nbp-settings';
import { NbpPage } from './nbp-page';

/** Frontend half of the NBP plugin: a sidebar entry, a page, and the custom
 * settings panel rendered on /admin/plugins. */
export const nbpWebPlugin: MarketlumWebPlugin = {
  id: 'nbp',
  nav: [{ slug: 'nbp', labelKey: 'plugin.nbp.nav.rates', icon: RefreshCw, group: 'system' }],
  routes: [{ slug: 'nbp', Component: NbpPage }],
  SettingsComponent: NbpSettings,
  settingsSchema: nbpSettingsSchema,
};

export { NbpSettings } from './nbp-settings';
export { NbpPage } from './nbp-page';
export { nbpMessages } from './messages';
