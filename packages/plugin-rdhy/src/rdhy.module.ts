import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent, Agreement, Invoice, Value } from '@marketlum/core';
import { RdhyPlatform } from './platforms/rdhy-platform.entity';
import { RdhyPlatformAgent } from './platforms/rdhy-platform-agent.entity';
import { PlatformsController } from './platforms/platforms.controller';
import { AssignmentsController } from './platforms/assignments.controller';
import { PlatformsService } from './platforms/platforms.service';
import { RdhyVamAgreement } from './vam/rdhy-vam-agreement.entity';
import { RdhyVamMilestone } from './vam/rdhy-vam-milestone.entity';
import { RdhyVamItem } from './vam/rdhy-vam-item.entity';
import { RdhyVamCostEntry } from './vam/rdhy-vam-cost-entry.entity';
import { RdhyVamInvestmentEntry } from './vam/rdhy-vam-investment-entry.entity';
import { RdhyVamTerminationCondition } from './vam/rdhy-vam-termination-condition.entity';
import { VamAgreementsController } from './vam/vam-agreements.controller';
import { VamAgreementsService } from './vam/vam-agreements.service';
import { VamPerformanceService } from './vam/vam-performance.service';
import { RdhyEmcAgreement } from './emc/rdhy-emc-agreement.entity';
import { RdhyEmcNode } from './emc/rdhy-emc-node.entity';
import { RdhyEmcExposedService } from './emc/rdhy-emc-exposed-service.entity';
import { RdhyEmcLeadingGoal } from './emc/rdhy-emc-leading-goal.entity';
import { RdhyEmcCostEntry } from './emc/rdhy-emc-cost-entry.entity';
import { RdhyEmcTerminationCondition } from './emc/rdhy-emc-termination-condition.entity';
import { EmcAgreementsController } from './emc/emc-agreements.controller';
import { EmcAgreementsService } from './emc/emc-agreements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
      Agent,
      Value,
      Agreement,
      Invoice,
    ]),
  ],
  controllers: [
    PlatformsController,
    AssignmentsController,
    VamAgreementsController,
    EmcAgreementsController,
  ],
  providers: [PlatformsService, VamAgreementsService, VamPerformanceService, EmcAgreementsService],
  exports: [PlatformsService, VamAgreementsService, VamPerformanceService, EmcAgreementsService],
})
export class RdhyModule {}
