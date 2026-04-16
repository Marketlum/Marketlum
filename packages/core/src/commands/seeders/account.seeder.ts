import { faker } from '@faker-js/faker';
import { AccountsService } from '../../ledger/accounts.service';

interface AccountDeps {
  values: Array<{ id: string; name: string }>;
  agents: Array<{ id: string; name: string }>;
}

export async function seedAccounts(service: AccountsService, deps: AccountDeps) {
  const accounts: Array<{ id: string; name: string }> = [];

  // Create an account for each agent/value combination (first 6 pairs)
  for (let i = 0; i < Math.min(6, deps.agents.length * deps.values.length); i++) {
    const agent = deps.agents[i % deps.agents.length];
    const value = deps.values[i % deps.values.length];

    const account = await service.create({
      name: `${agent.name} — ${value.name}`,
      description: faker.lorem.sentence(),
      valueId: value.id,
      agentId: agent.id,
    });
    accounts.push({ id: account.id, name: account.name });
  }

  return accounts;
}
