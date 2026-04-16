import { faker } from '@faker-js/faker';
import { ValueInstancesService } from '../../value-instances/value-instances.service';

interface ValueInstanceDeps {
  values: Array<{ id: string; name: string }>;
  agents: Array<{ id: string }>;
}

export async function seedValueInstances(service: ValueInstancesService, deps: ValueInstanceDeps) {
  const instances: Array<{ id: string; name: string; valueId: string }> = [];

  for (let i = 0; i < Math.min(6, deps.values.length); i++) {
    const value = deps.values[i % deps.values.length];
    const fromAgent = deps.agents[i % deps.agents.length];
    const toAgent = deps.agents[(i + 1) % deps.agents.length];

    const instance = await service.create({
      name: `${value.name} — Instance ${i + 1}`,
      purpose: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      version: `${faker.number.int({ min: 1, max: 3 })}.${faker.number.int({ min: 0, max: 9 })}.0`,
      valueId: value.id,
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
    });
    instances.push({ id: instance.id, name: instance.name, valueId: value.id });
  }

  return instances;
}
