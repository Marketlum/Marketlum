import { FileSpreadsheet, Network, Workflow } from 'lucide-react';
import type { MarketlumWebPlugin } from '@marketlum/ui';
import { PlatformsListPage } from './platforms-list-page';
import { PlatformDetailPage } from './platform-detail-page';
import { VamAgreementsListPage } from './vam-agreements-list-page';
import { VamAgreementDetailPage } from './vam-agreement-detail-page';
import { EmcAgreementsListPage } from './emc-agreements-list-page';
import { EmcAgreementDetailPage } from './emc-agreement-detail-page';

/** Frontend half of the RDHY plugin: a "RenDanHeYi" sidebar group with the
 * platform catalog, the VAM agreement canvases and the EMC agreement
 * canvases (list + detail pages under /admin/x/platforms,
 * /admin/x/vam-agreements and /admin/x/emc-agreements). */
export const rdhyWebPlugin: MarketlumWebPlugin = {
  id: 'rdhy',
  nav: [
    {
      slug: 'platforms',
      labelKey: 'plugin.rdhy.nav.platforms',
      icon: Network,
      group: 'rdhy',
      groupLabelKey: 'plugin.rdhy.nav.group',
      resource: 'rdhy.platforms',
    },
    {
      slug: 'vam-agreements',
      labelKey: 'plugin.rdhy.nav.vamAgreements',
      icon: FileSpreadsheet,
      group: 'rdhy',
      groupLabelKey: 'plugin.rdhy.nav.group',
      resource: 'rdhy.vam-agreements',
    },
    {
      slug: 'emc-agreements',
      labelKey: 'plugin.rdhy.nav.emcAgreements',
      icon: Workflow,
      group: 'rdhy',
      groupLabelKey: 'plugin.rdhy.nav.group',
      resource: 'rdhy.emc-agreements',
    },
  ],
  routes: [
    { slug: 'platforms', Component: PlatformsListPage },
    { slug: 'platforms/:id', Component: PlatformDetailPage },
    { slug: 'vam-agreements', Component: VamAgreementsListPage },
    { slug: 'vam-agreements/:id', Component: VamAgreementDetailPage },
    { slug: 'emc-agreements', Component: EmcAgreementsListPage },
    { slug: 'emc-agreements/:id', Component: EmcAgreementDetailPage },
  ],
};

export { PlatformsListPage } from './platforms-list-page';
export { PlatformDetailPage } from './platform-detail-page';
export { VamAgreementsListPage } from './vam-agreements-list-page';
export { VamAgreementDetailPage } from './vam-agreement-detail-page';
export { EmcAgreementsListPage } from './emc-agreements-list-page';
export { EmcAgreementDetailPage } from './emc-agreement-detail-page';
export { rdhyMessages } from './messages';
