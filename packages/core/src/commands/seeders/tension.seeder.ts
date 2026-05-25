import { TensionsService } from '../../tensions/tensions.service';

interface TensionDeps {
  agents: Array<{ id: string; name: string }>;
  users: Array<{ id: string }>;
}

interface TensionSeed {
  name: string;
  currentContext: string;
  potentialFuture: string;
  score: number;
  agent: string; // agent.name — the party that owns the problem
}

// Battery-value-chain themed tensions. Each one belongs to the agent that
// would realistically be accountable for resolving it: Acme Corp owns the
// manufacturing and product-line tensions, TechNova owns the BMS/firmware
// tension, GreenLeaf owns recycling and take-back compliance, and so on.
const TENSIONS: TensionSeed[] = [
  {
    name: 'NMC811 cell line yield drop',
    currentContext:
      'Sustained yield on the NMC811 cell line is holding at 86%, well below the 92% pilot target; rework backlog is two weeks deep.',
    potentialFuture:
      'Closed-loop dry-room humidity control and a tightened electrode coating window lift sustained yield past 93%.',
    score: 9,
    agent: 'Acme Corp',
  },
  {
    name: 'Lithium offtake exposed to spot market',
    currentContext:
      'Half of battery-grade lithium carbonate volume is still purchased on the spot market, with prices swinging 40% quarter to quarter.',
    potentialFuture:
      'Long-term offtake agreements lock down 90% of carbonate volume and give finance a flat cost curve to plan against.',
    score: 8,
    agent: 'Acme Corp',
  },
  {
    name: 'Module-level thermal runaway propagation gap',
    currentContext:
      'Current module design relies on cell-level vents only; the reinsurer is asking for module-level propagation barriers before underwriting the grid-scale array.',
    potentialFuture:
      'A mica-barrier retrofit and an updated safety case clear reinsurer review and unlock larger utility deployments.',
    score: 9,
    agent: 'Acme Corp',
  },
  {
    name: 'BMS firmware fragmentation across chemistries',
    currentContext:
      'Four firmware branches are in production across NMC, LFP, and the pilot solid-state line; each chemistry change forces hand-tuning.',
    potentialFuture:
      'A single parameterized BMS firmware drops calibration time per pack from days to hours and removes a class of field-bug regressions.',
    score: 7,
    agent: 'TechNova Solutions',
  },
  {
    name: 'Grid interconnection queue blocking revenue',
    currentContext:
      'The utility interconnection queue is averaging eleven months, leaving completed grid-scale arrays sitting on the pad with no revenue recognition.',
    potentialFuture:
      'Pre-application engineering bundles and a co-located substation deal cut queue time in half for new sites.',
    score: 8,
    agent: 'AutoFlow Bot',
  },
  {
    name: 'Hydrometallurgical cathode recovery yield',
    currentContext:
      'The hydrometallurgical route recovers 78% of cathode mass; the rest leaves the plant as low-grade waste with disposal cost attached.',
    potentialFuture:
      'A two-stage leach with selective precipitation pushes recovery past 90% and turns the waste stream into a margin line.',
    score: 7,
    agent: 'GreenLeaf Partners',
  },
  {
    name: 'Installer capacity for utility rollouts',
    currentContext:
      'Only three certified install crews operate in the region; lead time from contract signature to site mobilization is six weeks and growing.',
    potentialFuture:
      'A standing pool of twelve certified crews with shared scheduling brings mobilization down to two weeks.',
    score: 6,
    agent: 'James Liu',
  },
  {
    name: 'Solid-state cell cycle-life below OEM bar',
    currentContext:
      'The solid-state prototype hits the target energy density but cycle life caps out at 600 cycles — well below the 2,000 that OEMs require for sampling.',
    potentialFuture:
      'An interlayer additive and adjusted charge profile push validated cycle life past 2,000 and open OEM sampling.',
    score: 5,
    agent: 'Sarah Palmer',
  },
  {
    name: 'UL 9540A backlog delaying cabinet shipments',
    currentContext:
      'The UL 9540A test slot is booked four months out; new cabinets ship on conditional acceptance, which caps deal size with risk-averse buyers.',
    potentialFuture:
      'An in-house pre-test rig validates suppression design before lab booking and compresses certification by a full quarter.',
    score: 7,
    agent: 'Acme Corp',
  },
  {
    name: 'EU Battery Regulation reporting is manual',
    currentContext:
      'Quarterly take-back reporting is assembled from spreadsheets across three logistics partners; audit risk grows with every shipment.',
    potentialFuture:
      'Serialized pack tracking and an automated regulatory ledger turn quarterly compliance into a one-click export.',
    score: 6,
    agent: 'GreenLeaf Partners',
  },
  {
    name: 'Performance warranty payout exposure',
    currentContext:
      'Round-trip efficiency degradation on the first deployed fleet is tracking 0.5% per year ahead of warranty assumptions, threatening the first payout in 2027.',
    potentialFuture:
      'A mid-life rebalance program and refined SoC limits keep degradation inside the warranted envelope.',
    score: 6,
    agent: 'Acme Corp',
  },
  {
    name: 'NiMH spares line absorbing service hours',
    currentContext:
      'NiMH spares orders are flat at 8% of revenue but absorb 20% of customer-service hours and tie up a production cell on the pilot floor.',
    potentialFuture:
      'A migration incentive moves the last service accounts onto lithium packs, freeing the cell for solid-state pilot capacity.',
    score: 4,
    agent: 'Acme Corp',
  },
];

export async function seedTensions(service: TensionsService, deps: TensionDeps) {
  const agentsByName = new Map(deps.agents.map((a) => [a.name, a]));
  const tensions: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < TENSIONS.length; i++) {
    const data = TENSIONS[i];
    const agent = agentsByName.get(data.agent);
    if (!agent) throw new Error(`Tension seeder: missing agent "${data.agent}"`);
    const user = deps.users[i % deps.users.length];

    const tension = await service.create({
      name: data.name,
      currentContext: data.currentContext,
      potentialFuture: data.potentialFuture,
      score: data.score,
      agentId: agent.id,
      leadUserId: user.id,
    });
    tensions.push({ id: tension.id, name: tension.name });
  }

  return tensions;
}
