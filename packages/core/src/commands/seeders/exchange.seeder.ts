import { faker } from '@faker-js/faker';
import { ExchangesService } from '../../exchanges/exchanges.service';

interface ExchangeDeps {
  agents: Array<{ id: string; name: string }>;
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

export async function seedExchanges(service: ExchangesService, deps: ExchangeDeps) {
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

    const exchange = await service.create({
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
  }

  return exchanges;
}
