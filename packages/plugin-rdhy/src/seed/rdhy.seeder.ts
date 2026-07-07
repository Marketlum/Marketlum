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
import type { RdhyVamTrack } from '../shared/vam-schemas';

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
