import { Network } from 'lucide-react';
import type { MarketlumWebPlugin } from '@marketlum/ui';
import { PlatformsListPage } from './platforms-list-page';
import { PlatformDetailPage } from './platform-detail-page';

/** Frontend half of the RDHY plugin: a "RenDanHeYi" sidebar group with the
 * platform catalog (list + detail pages under /admin/x/platforms). */
export const rdhyWebPlugin: MarketlumWebPlugin = {
  id: 'rdhy',
  nav: [
    {
      slug: 'platforms',
      labelKey: 'plugin.rdhy.nav.platforms',
      icon: Network,
      group: 'rdhy',
      groupLabelKey: 'plugin.rdhy.nav.group',
    },
  ],
  routes: [
    { slug: 'platforms', Component: PlatformsListPage },
    { slug: 'platforms/:id', Component: PlatformDetailPage },
  ],
};

export { PlatformsListPage } from './platforms-list-page';
export { PlatformDetailPage } from './platform-detail-page';
export { rdhyMessages } from './messages';
