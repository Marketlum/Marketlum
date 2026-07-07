import type { MarketlumApiPlugin } from '@marketlum/core';
import { RdhyModule } from './rdhy.module';
import { RdhyPlatform } from './platforms/rdhy-platform.entity';
import { RdhyPlatformValueStream } from './platforms/rdhy-platform-value-stream.entity';
import { RdhyVamAgreement } from './vam/rdhy-vam-agreement.entity';
import { RdhyVamMilestone } from './vam/rdhy-vam-milestone.entity';
import { RdhyVamItem } from './vam/rdhy-vam-item.entity';
import { RdhyVamCostEntry } from './vam/rdhy-vam-cost-entry.entity';
import { RdhyVamInvestmentEntry } from './vam/rdhy-vam-investment-entry.entity';
import { RdhyVamTerminationCondition } from './vam/rdhy-vam-termination-condition.entity';
import { CreateRdhyPlatformTables1700000000100 } from './migrations/1700000000100-CreateRdhyPlatformTables';
import { CreateRdhyVamTables1700000000101 } from './migrations/1700000000101-CreateRdhyVamTables';
import { seedRdhy } from './seed/rdhy.seeder';
import { RDHY_PLUGIN_ID } from './shared/schemas';

/** The RenDanHeYi plugin: groups core value streams into plugin-owned
 * platforms (spec 013) and models VAM canvas agreements (spec 014).
 * Owns the plugin_rdhy_* tables; never touches core. */
export const rdhyPlugin: MarketlumApiPlugin = {
  manifest: {
    id: RDHY_PLUGIN_ID,
    name: 'RenDanHeYi',
    version: '0.2.0',
    marketlumCoreVersion: '^0.4.0',
  },
  module: RdhyModule,
  entities: [
    RdhyPlatform,
    RdhyPlatformValueStream,
    RdhyVamAgreement,
    RdhyVamMilestone,
    RdhyVamItem,
    RdhyVamCostEntry,
    RdhyVamInvestmentEntry,
    RdhyVamTerminationCondition,
  ],
  migrations: [CreateRdhyPlatformTables1700000000100, CreateRdhyVamTables1700000000101],
  primaryEntities: [RdhyPlatform, RdhyVamAgreement],
  seed: seedRdhy,
};

export { RdhyModule } from './rdhy.module';
export { RdhyPlatform } from './platforms/rdhy-platform.entity';
export { RdhyPlatformValueStream } from './platforms/rdhy-platform-value-stream.entity';
export { PlatformsService } from './platforms/platforms.service';
export { RdhyVamAgreement } from './vam/rdhy-vam-agreement.entity';
export { RdhyVamMilestone } from './vam/rdhy-vam-milestone.entity';
export { RdhyVamItem } from './vam/rdhy-vam-item.entity';
export { RdhyVamCostEntry } from './vam/rdhy-vam-cost-entry.entity';
export { RdhyVamInvestmentEntry } from './vam/rdhy-vam-investment-entry.entity';
export { RdhyVamTerminationCondition } from './vam/rdhy-vam-termination-condition.entity';
export { VamAgreementsService } from './vam/vam-agreements.service';
export { seedRdhy } from './seed/rdhy.seeder';
export * from './shared/schemas';
