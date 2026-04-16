import { faker } from '@faker-js/faker';
import { ValuesService } from '../../values/values.service';
import { ValueType, ValueLifecycleStage } from '@marketlum/shared';

interface ValueDeps {
  taxonomies: { all: Array<{ id: string }> };
  agents: Array<{ id: string }>;
  valueStreams: { all: Array<{ id: string }> };
}

const VALUES = [
  { name: 'Cloud Platform License', type: ValueType.RIGHT, purpose: 'Annual platform access license', lifecycleStage: ValueLifecycleStage.STABLE },
  { name: 'Data Analytics Suite', type: ValueType.PRODUCT, purpose: 'Business intelligence and analytics toolset', lifecycleStage: ValueLifecycleStage.STABLE },
  { name: 'Integration Middleware', type: ValueType.PRODUCT, purpose: 'API gateway and integration layer', lifecycleStage: ValueLifecycleStage.BETA },
  { name: 'Implementation Consulting', type: ValueType.SERVICE, purpose: 'Professional services for platform onboarding', lifecycleStage: ValueLifecycleStage.STABLE },
  { name: 'Managed Operations', type: ValueType.SERVICE, purpose: '24/7 monitoring and incident management', lifecycleStage: ValueLifecycleStage.STABLE },
  { name: 'Strategic Partnership', type: ValueType.RELATIONSHIP, purpose: 'Long-term co-development relationship', lifecycleStage: ValueLifecycleStage.ALPHA },
  { name: 'API Access Token', type: ValueType.RIGHT, purpose: 'Programmatic access to platform APIs', lifecycleStage: ValueLifecycleStage.STABLE },
  { name: 'Training Program', type: ValueType.SERVICE, purpose: 'Certification and skills development', lifecycleStage: ValueLifecycleStage.IDEA },
];

export async function seedValues(service: ValuesService, deps: ValueDeps) {
  const values: Array<{ id: string; name: string; type: ValueType }> = [];

  for (let i = 0; i < VALUES.length; i++) {
    const data = VALUES[i];
    const taxonomy = deps.taxonomies.all[i % deps.taxonomies.all.length];
    const agent = deps.agents[i % deps.agents.length];
    const valueStream = deps.valueStreams.all[i % deps.valueStreams.all.length];

    const value = await service.create({
      name: data.name,
      type: data.type,
      purpose: data.purpose,
      description: faker.lorem.paragraph(),
      lifecycleStage: data.lifecycleStage,
      mainTaxonomyId: taxonomy.id,
      agentId: agent.id,
      valueStreamId: valueStream.id,
    });
    values.push({ id: value.id, name: value.name, type: data.type });
  }

  return values;
}
