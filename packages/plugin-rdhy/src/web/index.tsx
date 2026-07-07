import { FileSpreadsheet, Network } from 'lucide-react';
import type { MarketlumWebPlugin } from '@marketlum/ui';
import { PlatformsListPage } from './platforms-list-page';
import { PlatformDetailPage } from './platform-detail-page';
import { VamAgreementsListPage } from './vam-agreements-list-page';
import { VamAgreementDetailPage } from './vam-agreement-detail-page';

/** Frontend half of the RDHY plugin: a "RenDanHeYi" sidebar group with the
 * platform catalog and the VAM agreement canvases (list + detail pages
 * under /admin/x/platforms and /admin/x/vam-agreements). */
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
    {
      slug: 'vam-agreements',
      labelKey: 'plugin.rdhy.nav.vamAgreements',
      icon: FileSpreadsheet,
      group: 'rdhy',
      groupLabelKey: 'plugin.rdhy.nav.group',
    },
  ],
  routes: [
    { slug: 'platforms', Component: PlatformsListPage },
    { slug: 'platforms/:id', Component: PlatformDetailPage },
    { slug: 'vam-agreements', Component: VamAgreementsListPage },
    { slug: 'vam-agreements/:id', Component: VamAgreementDetailPage },
  ],
};

export { PlatformsListPage } from './platforms-list-page';
export { PlatformDetailPage } from './platform-detail-page';
export { VamAgreementsListPage } from './vam-agreements-list-page';
export { VamAgreementDetailPage } from './vam-agreement-detail-page';
export { rdhyMessages } from './messages';
