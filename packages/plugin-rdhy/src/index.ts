import type { MarketlumApiPlugin } from '@marketlum/core';
import { RdhyModule } from './rdhy.module';
import { RdhyPlatform } from './platforms/rdhy-platform.entity';
import { RdhyPlatformAgent } from './platforms/rdhy-platform-agent.entity';
import { RdhyVamAgreement } from './vam/rdhy-vam-agreement.entity';
import { RdhyVamMilestone } from './vam/rdhy-vam-milestone.entity';
import { RdhyVamItem } from './vam/rdhy-vam-item.entity';
import { RdhyVamCostEntry } from './vam/rdhy-vam-cost-entry.entity';
import { RdhyVamInvestmentEntry } from './vam/rdhy-vam-investment-entry.entity';
import { RdhyVamTerminationCondition } from './vam/rdhy-vam-termination-condition.entity';
import { RdhyEmcAgreement } from './emc/rdhy-emc-agreement.entity';
import { RdhyEmcNode } from './emc/rdhy-emc-node.entity';
import { RdhyEmcExposedService } from './emc/rdhy-emc-exposed-service.entity';
import { RdhyEmcLeadingGoal } from './emc/rdhy-emc-leading-goal.entity';
import { RdhyEmcCostEntry } from './emc/rdhy-emc-cost-entry.entity';
import { RdhyEmcTerminationCondition } from './emc/rdhy-emc-termination-condition.entity';
import { CreateRdhyPlatformTables1700000000100 } from './migrations/1700000000100-CreateRdhyPlatformTables';
import { CreateRdhyVamTables1700000000101 } from './migrations/1700000000101-CreateRdhyVamTables';
import { CreateRdhyEmcTables1700000000102 } from './migrations/1700000000102-CreateRdhyEmcTables';
import { RdhyAgentCentric1700000000103 } from './migrations/1700000000103-RdhyAgentCentric';
import { seedRdhy } from './seed/rdhy.seeder';
import { RDHY_PLUGIN_ID } from './shared/schemas';

/** The RenDanHeYi plugin: groups core agents into plugin-owned platforms
 * (spec 013), models VAM canvas agreements (spec 014) and EMC canvas
 * agreements (spec 015) — all agent-centric. Owns the plugin_rdhy_*
 * tables; never touches core. */
export const rdhyPlugin: MarketlumApiPlugin = {
  manifest: {
    id: RDHY_PLUGIN_ID,
    name: 'RenDanHeYi',
    version: '0.4.0',
    marketlumCoreVersion: '^0.4.0',
  },
  module: RdhyModule,
  entities: [
    RdhyPlatform,
    RdhyPlatformAgent,
    RdhyVamAgreement,
    RdhyVamMilestone,
    RdhyVamItem,
    RdhyVamCostEntry,
    RdhyVamInvestmentEntry,
    RdhyVamTerminationCondition,
    RdhyEmcAgreement,
    RdhyEmcNode,
    RdhyEmcExposedService,
    RdhyEmcLeadingGoal,
    RdhyEmcCostEntry,
    RdhyEmcTerminationCondition,
  ],
  migrations: [
    CreateRdhyPlatformTables1700000000100,
    CreateRdhyVamTables1700000000101,
    CreateRdhyEmcTables1700000000102,
    RdhyAgentCentric1700000000103,
  ],
  primaryEntities: [RdhyPlatform, RdhyVamAgreement, RdhyEmcAgreement],
  seed: seedRdhy,
};

export { RdhyModule } from './rdhy.module';
export { RdhyPlatform } from './platforms/rdhy-platform.entity';
export { RdhyPlatformAgent } from './platforms/rdhy-platform-agent.entity';
export { PlatformsService } from './platforms/platforms.service';
export { RdhyVamAgreement } from './vam/rdhy-vam-agreement.entity';
export { RdhyVamMilestone } from './vam/rdhy-vam-milestone.entity';
export { RdhyVamItem } from './vam/rdhy-vam-item.entity';
export { RdhyVamCostEntry } from './vam/rdhy-vam-cost-entry.entity';
export { RdhyVamInvestmentEntry } from './vam/rdhy-vam-investment-entry.entity';
export { RdhyVamTerminationCondition } from './vam/rdhy-vam-termination-condition.entity';
export { VamAgreementsService } from './vam/vam-agreements.service';
export { RdhyEmcAgreement } from './emc/rdhy-emc-agreement.entity';
export { RdhyEmcNode } from './emc/rdhy-emc-node.entity';
export { RdhyEmcExposedService } from './emc/rdhy-emc-exposed-service.entity';
export { RdhyEmcLeadingGoal } from './emc/rdhy-emc-leading-goal.entity';
export { RdhyEmcCostEntry } from './emc/rdhy-emc-cost-entry.entity';
export { RdhyEmcTerminationCondition } from './emc/rdhy-emc-termination-condition.entity';
export { EmcAgreementsService } from './emc/emc-agreements.service';
export { seedRdhy } from './seed/rdhy.seeder';
export * from './shared/schemas';
