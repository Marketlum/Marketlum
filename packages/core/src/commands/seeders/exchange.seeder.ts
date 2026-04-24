import { faker } from '@faker-js/faker';
import { ExchangesService } from '../../exchanges/exchanges.service';
import { ExchangeFlowsService } from '../../exchanges/exchange-flows.service';

interface ExchangeDeps {
  agents: Array<{ id: string; name: string }>;
  values: Array<{ id: string; name: string }>;
  valueStreams: { all: Array<{ id: string }> };
  channels: { all: Array<{ id: string }> };
  pipelines: Array<{ id: string }>;
  users: Array<{ id: string }>;
  tensions: Array<{ id: string }>;
}

const EXCHANGES = [
  { name: 'Platform licensing deal', purpose: 'Annual enterprise license negotiation' },
  { name: 'Consulting engagement', purpose: 'Q2 implementation project scoping' },
  { name: 'Partner onboarding', purpose: 'New channel partner integration' },
  { name: 'Service renewal', purpose: 'Managed services contract renewal' },
];

export async function seedExchanges(
  exchangesService: ExchangesService,
  flowsService: ExchangeFlowsService,
  deps: ExchangeDeps,
) {
  const exchanges: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < EXCHANGES.length; i++) {
    const data = EXCHANGES[i];
    const partyA = deps.agents[i % deps.agents.length];
    const partyB = deps.agents[(i + 1) % deps.agents.length];
    const valueStream = deps.valueStreams.all[i % deps.valueStreams.all.length];
    const channel = deps.channels.all[i % deps.channels.all.length];
    const pipeline = deps.pipelines[i % deps.pipelines.length];
    const user = deps.users[i % deps.users.length];
    const tension = deps.tensions[i % deps.tensions.length];

    const exchange = await exchangesService.create({
      name: data.name,
      purpose: data.purpose,
      description: faker.lorem.paragraph(),
      valueStreamId: valueStream.id,
      channelId: channel.id,
      pipelineId: pipeline.id,
      leadUserId: user.id,
      tensionId: tension.id,
      parties: [
        { agentId: partyA.id, role: 'Seller' },
        { agentId: partyB.id, role: 'Buyer' },
      ],
    });
    exchanges.push({ id: exchange.id, name: exchange.name });

    // Create 2 flows per exchange: one from seller to buyer, one from buyer to seller
    const valueA = deps.values[i % deps.values.length];
    const valueB = deps.values[(i + 1) % deps.values.length];

    await flowsService.create(exchange.id, {
      valueId: valueA.id,
      fromAgentId: partyA.id,
      toAgentId: partyB.id,
      quantity: `${faker.number.int({ min: 1, max: 10 })}.00`,
    });

    await flowsService.create(exchange.id, {
      valueId: valueB.id,
      fromAgentId: partyB.id,
      toAgentId: partyA.id,
      quantity: `${faker.number.int({ min: 1, max: 5 })}.00`,
    });
  }

  return exchanges;
}
