import { DataSource } from 'typeorm';
import { Value, ValueStream } from '@marketlum/core';
import { RdhyPlatform } from '../platforms/rdhy-platform.entity';
import { RdhyPlatformValueStream } from '../platforms/rdhy-platform-value-stream.entity';
import { RdhyVamAgreement } from '../vam/rdhy-vam-agreement.entity';
import { RdhyVamMilestone } from '../vam/rdhy-vam-milestone.entity';
import { RdhyVamItem } from '../vam/rdhy-vam-item.entity';
import { RdhyVamCostEntry } from '../vam/rdhy-vam-cost-entry.entity';
import { RdhyVamInvestmentEntry } from '../vam/rdhy-vam-investment-entry.entity';
import { RdhyVamTerminationCondition } from '../vam/rdhy-vam-termination-condition.entity';
import { RdhyEmcAgreement } from '../emc/rdhy-emc-agreement.entity';
import { RdhyEmcNode } from '../emc/rdhy-emc-node.entity';
import { RdhyEmcExposedService } from '../emc/rdhy-emc-exposed-service.entity';
import { RdhyEmcLeadingGoal } from '../emc/rdhy-emc-leading-goal.entity';
import { RdhyEmcCostEntry } from '../emc/rdhy-emc-cost-entry.entity';
import { RdhyEmcTerminationCondition } from '../emc/rdhy-emc-termination-condition.entity';
import type { RdhyVamTrack } from '../shared/vam-schemas';
import type { RdhyEmcNodeTier } from '../shared/emc-schemas';

const PLATFORMS: Array<Pick<RdhyPlatform, 'code' | 'name' | 'description'>> = [
  {
    code: 'industrial_platform',
    name: 'Industrial Platform',
    description: 'Hosts product-facing value streams operating toward the market.',
  },
  {
    code: 'shared_services',
    name: 'Shared Services',
    description: 'Hosts internal value streams providing shared capabilities.',
  },
];

/** How many existing value streams get assigned across the sample platforms. */
const ASSIGNMENT_TARGET = 4;

const VAM_TITLE = 'Web 3 Consulting HUB';
const VAM_DRAFT_TITLE = 'Web 3 Consulting HUB — renewal';

/** The sample canvas, adapted from the source VAM Canvas PDF (spec 014 §8). */
const VAM_MILESTONES: Array<{
  offsetMonths: number;
  items: Array<{ track: RdhyVamTrack; description: string; amount?: number }>;
}> = [
  {
    offsetMonths: 3,
    items: [
      { track: 'DIRECT_VALUE', description: 'All offerings prepared' },
      { track: 'INDIRECT_VALUE', description: 'External Web 3 partners activated' },
      { track: 'INDIRECT_VALUE', description: '10 prospects identified' },
    ],
  },
  {
    offsetMonths: 6,
    items: [
      { track: 'DIRECT_VALUE', description: 'First 2 projects sold' },
      { track: 'DIRECT_VALUE', description: 'First $500K of revenues delivered', amount: 500000 },
      { track: 'INDIRECT_VALUE', description: 'Each offering validated through feedback of 3 clients' },
      { track: 'VARIABLE_PAY', description: '$50K bonus for owners', amount: 50000 },
    ],
  },
  {
    offsetMonths: 9,
    items: [
      { track: 'DIRECT_VALUE', description: 'Other 3 projects sold' },
      { track: 'DIRECT_VALUE', description: 'First $250K of margin', amount: 250000 },
      { track: 'INDIRECT_VALUE', description: 'Network of 50 partners consolidated' },
      { track: 'VARIABLE_PAY', description: 'Additional $50K bonus for owners', amount: 50000 },
      { track: 'PROFIT_SHARING', description: '10% of profit sharing for the team' },
    ],
  },
  {
    offsetMonths: 12,
    items: [
      { track: 'DIRECT_VALUE', description: 'Second $500K of revenues delivered', amount: 500000 },
      { track: 'DIRECT_VALUE', description: 'Second $250K of margin', amount: 250000 },
      { track: 'VARIABLE_PAY', description: '$20K of variable pay for the team', amount: 20000 },
      { track: 'PROFIT_SHARING', description: '10% of profit sharing for the team' },
      {
        track: 'EQUITY',
        description: 'Owners will be invited to acquire 10% of the equity at convenient access conditions',
      },
    ],
  },
];

const VAM_COSTS: Array<{
  category: RdhyVamCostEntry['category'];
  label: string;
  amount: number;
  headcount?: number;
}> = [
  { category: 'SHARED_SERVICE_PLATFORMS', label: 'Technology license costs', amount: 50000 },
  { category: 'NODE_MICRO_ENTERPRISES', label: 'Costs for other internal services', amount: 150000 },
  { category: 'EXTERNAL_NODES', label: 'Labour costs for external partners', amount: 100000 },
  { category: 'EMC_PARTICIPATION', label: '2 FTEs for the DAO Infrastructure EMC', amount: 150000 },
  { category: 'LEADERS_SALARY', label: '1 leader', amount: 50000, headcount: 1 },
  { category: 'TEAM_SALARY', label: '3 team members', amount: 90000, headcount: 3 },
];

const VAM_INVESTMENTS: Array<{
  kind: RdhyVamInvestmentEntry['kind'];
  label: string;
  amount: number;
}> = [
  {
    kind: 'CAPITAL_INVESTMENT',
    label: 'Capital to acquire technology and sustain go-to-market',
    amount: 200000,
  },
  { kind: 'TEAM_ALLOWANCE', label: 'Allowance for team members', amount: 45000 },
  { kind: 'INTERNAL_SERVICES_ALLOWANCE', label: 'Allowance for internal services', amount: 75000 },
  { kind: 'EXTERNAL_SERVICES_ALLOWANCE', label: 'Allowance for external services', amount: 50000 },
];

const VAM_TERMINATION_CONDITIONS = [
  'The micro-enterprise will be terminated if the leading goals (revenues and margin) are missed by more than 15%',
  'The micro-enterprise will be terminated when exceeding the cashflow allowance and not being able to recover within 3 months',
];

const EMC_TITLE = 'DAO Infrastructure EMC';

/** The sample EMC setting and micro-nodes, adapted from the source EMC Canvas
 * PDF (spec 015). Nodes are anchored to whichever value streams exist, in
 * candidate order: leading strategic hub, strategic development, tactical
 * legal counseling. */
const EMC_SETTING = {
  collaborativeScenario:
    'Proposing, selling and supporting a market leading DAO technological infrastructure for corporate clients',
  collaborativeGoals: 'Signing and delivering 15 contracts for $10M within 1.5 year',
  governanceModel:
    'Decisions made by consent (no objections) coordinated by the owner of the lead ME',
  reinvestmentPercent: '5.00',
  investmentNote:
    'Additional 5% of the profits reinvested among all parties involved to foster further development and growth of the EMC',
};

const EMC_NODES: Array<{
  tier: RdhyEmcNodeTier;
  isLeading: boolean;
  profitSharePercent: string | null;
  services: string[];
  goals: string[];
  costEntries: Array<{ label: string; amount: number; headcount?: number }>;
}> = [
  {
    tier: 'STRATEGIC',
    isLeading: true,
    profitSharePercent: '10.00',
    services: [
      'Defining the DAO protocol',
      'Designing the UX and interaction',
      'Writing functional specs',
      'Selling the service to clients',
      'Performing account and project management',
    ],
    goals: [
      'Guaranteeing the minimum number of clients',
      'Guaranteeing the minimum amount of revenues',
      'Achieving an effective and pleasant collaboration among all parties',
    ],
    costEntries: [{ label: '2 FTEs', amount: 150000, headcount: 2 }],
  },
  {
    tier: 'STRATEGIC',
    isLeading: false,
    profitSharePercent: '7.00',
    services: [
      'Implementing the DAO code following the given specs',
      'Testing and deploying the code',
      'Running software maintenance and bug fixing',
      'Delivering on change requests',
    ],
    goals: [
      'Code online within 90 days',
      'Less than 10 bugs found',
      'Complex bugs fixed within 3 days, simple bugs within 1 day',
    ],
    costEntries: [{ label: '3 FTEs', amount: 210000, headcount: 3 }],
  },
  {
    tier: 'TACTICAL',
    isLeading: false,
    profitSharePercent: null,
    services: [
      'Translating client requirements into a contractual agreement',
      'Evaluating and introducing local restrictions into the agreements',
      'Drafting the agreements for all the parties in the EMC',
    ],
    goals: ['Contracts ready within 30 days', 'Contracts signed within 45 days'],
    costEntries: [{ label: '2 FTEs', amount: 140000, headcount: 2 }],
  },
];

const EMC_TERMINATION_CONDITIONS = [
  'The EMC will be dissolved if the collaborative goals are missed by more than 25%',
  'A micro-node exits the EMC when its leading goals are repeatedly missed and no remediation is agreed by consent',
];

/** Idempotent: platforms are upserted by code, already-assigned streams are
 * skipped, and VAM agreements are upserted by title + value stream. */
export async function seedRdhy(dataSource: DataSource): Promise<void> {
  const platformRepository = dataSource.getRepository(RdhyPlatform);
  const linkRepository = dataSource.getRepository(RdhyPlatformValueStream);
  const valueStreamRepository = dataSource.getRepository(ValueStream);

  const platforms: RdhyPlatform[] = [];
  for (const definition of PLATFORMS) {
    let platform = await platformRepository.findOne({ where: { code: definition.code } });
    if (!platform) {
      platform = await platformRepository.save(platformRepository.create(definition));
    }
    platforms.push(platform);
  }

  const candidates = await valueStreamRepository.find({
    order: { code: 'ASC' },
    take: ASSIGNMENT_TARGET,
  });
  for (const [index, valueStream] of candidates.entries()) {
    const existing = await linkRepository.findOne({ where: { valueStreamId: valueStream.id } });
    if (existing) continue;
    await linkRepository.save(
      linkRepository.create({
        valueStreamId: valueStream.id,
        platformId: platforms[index % platforms.length].id,
      }),
    );
  }

  await seedVamAgreements(dataSource, platforms[0], candidates[0] ?? null);
  await seedEmcAgreement(dataSource, platforms[0], candidates);
}

async function seedEmcAgreement(
  dataSource: DataSource,
  sponsor: RdhyPlatform,
  valueStreams: ValueStream[],
): Promise<void> {
  if (valueStreams.length === 0) return;

  const agreementRepository = dataSource.getRepository(RdhyEmcAgreement);
  const existing = await agreementRepository.findOne({ where: { title: EMC_TITLE } });
  if (existing) return;

  const currency = await dataSource.getRepository(Value).findOne({ where: { code: 'usd' } });
  const agreement = await agreementRepository.save(
    agreementRepository.create({
      title: EMC_TITLE,
      platformId: sponsor.id,
      currencyId: currency?.id ?? null,
      status: 'ACTIVE',
      startedAt: new Date(),
      ...EMC_SETTING,
    }),
  );

  const nodeRepository = dataSource.getRepository(RdhyEmcNode);
  const serviceRepository = dataSource.getRepository(RdhyEmcExposedService);
  const goalRepository = dataSource.getRepository(RdhyEmcLeadingGoal);
  const costRepository = dataSource.getRepository(RdhyEmcCostEntry);
  for (const [ni, definition] of EMC_NODES.entries()) {
    const valueStream = valueStreams[ni];
    if (!valueStream) break;
    const node = await nodeRepository.save(
      nodeRepository.create({
        agreementId: agreement.id,
        valueStreamId: valueStream.id,
        tier: definition.tier,
        isLeading: definition.isLeading,
        profitSharePercent: definition.profitSharePercent,
        position: ni,
      }),
    );
    for (const [si, text] of definition.services.entries()) {
      await serviceRepository.save(
        serviceRepository.create({ nodeId: node.id, position: si, text }),
      );
    }
    for (const [gi, text] of definition.goals.entries()) {
      await goalRepository.save(goalRepository.create({ nodeId: node.id, position: gi, text }));
    }
    for (const [ci, cost] of definition.costEntries.entries()) {
      await costRepository.save(
        costRepository.create({
          nodeId: node.id,
          label: cost.label,
          amount: String(cost.amount),
          headcount: cost.headcount ?? null,
          position: ci,
        }),
      );
    }
  }

  const terminationRepository = dataSource.getRepository(RdhyEmcTerminationCondition);
  for (const [ti, text] of EMC_TERMINATION_CONDITIONS.entries()) {
    await terminationRepository.save(
      terminationRepository.create({ agreementId: agreement.id, position: ti, text }),
    );
  }
}

async function seedVamAgreements(
  dataSource: DataSource,
  sponsor: RdhyPlatform,
  valueStream: ValueStream | null,
): Promise<void> {
  if (!valueStream) return;

  const agreementRepository = dataSource.getRepository(RdhyVamAgreement);
  const currency = await dataSource
    .getRepository(Value)
    .findOne({ where: { code: 'usd' } });

  let active = await agreementRepository.findOne({
    where: { title: VAM_TITLE, valueStreamId: valueStream.id },
  });
  if (!active) {
    active = await agreementRepository.save(
      agreementRepository.create({
        title: VAM_TITLE,
        valueStreamId: valueStream.id,
        platformId: sponsor.id,
        horizonMonths: 12,
        currencyId: currency?.id ?? null,
        status: 'ACTIVE',
        startedAt: new Date(),
      }),
    );

    const milestoneRepository = dataSource.getRepository(RdhyVamMilestone);
    const itemRepository = dataSource.getRepository(RdhyVamItem);
    for (const [mi, milestone] of VAM_MILESTONES.entries()) {
      const savedMilestone = await milestoneRepository.save(
        milestoneRepository.create({
          agreementId: active.id,
          offsetMonths: milestone.offsetMonths,
          label: `${milestone.offsetMonths} months`,
          position: mi,
        }),
      );
      for (const [ii, item] of milestone.items.entries()) {
        await itemRepository.save(
          itemRepository.create({
            milestoneId: savedMilestone.id,
            track: item.track,
            description: item.description,
            amount: item.amount != null ? String(item.amount) : null,
            position: ii,
          }),
        );
      }
    }

    const costRepository = dataSource.getRepository(RdhyVamCostEntry);
    for (const [ci, cost] of VAM_COSTS.entries()) {
      await costRepository.save(
        costRepository.create({
          agreementId: active.id,
          category: cost.category,
          label: cost.label,
          amount: String(cost.amount),
          headcount: cost.headcount ?? null,
          position: ci,
        }),
      );
    }

    const investmentRepository = dataSource.getRepository(RdhyVamInvestmentEntry);
    for (const [vi, investment] of VAM_INVESTMENTS.entries()) {
      await investmentRepository.save(
        investmentRepository.create({
          agreementId: active.id,
          kind: investment.kind,
          label: investment.label,
          amount: String(investment.amount),
          position: vi,
        }),
      );
    }

    const terminationRepository = dataSource.getRepository(RdhyVamTerminationCondition);
    for (const [ti, text] of VAM_TERMINATION_CONDITIONS.entries()) {
      await terminationRepository.save(
        terminationRepository.create({ agreementId: active.id, position: ti, text }),
      );
    }
  }

  const draft = await agreementRepository.findOne({
    where: { title: VAM_DRAFT_TITLE, valueStreamId: valueStream.id },
  });
  if (!draft) {
    await agreementRepository.save(
      agreementRepository.create({
        title: VAM_DRAFT_TITLE,
        valueStreamId: valueStream.id,
        platformId: sponsor.id,
        horizonMonths: 12,
        currencyId: currency?.id ?? null,
        status: 'DRAFT',
      }),
    );
  }
}
