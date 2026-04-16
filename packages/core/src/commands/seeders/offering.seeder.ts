import { faker } from '@faker-js/faker';
import { OfferingsService } from '../../offerings/offerings.service';
import { OfferingState, ValueType } from '@marketlum/shared';

interface OfferingDeps {
  values: Array<{ id: string; name: string; type: ValueType }>;
  agents: Array<{ id: string }>;
  valueStreams: { all: Array<{ id: string }> };
}

const OFFERINGS = [
  { name: 'Enterprise Platform Bundle', purpose: 'Complete platform access with consulting', state: OfferingState.LIVE },
  { name: 'Analytics Starter Pack', purpose: 'Entry-level analytics with basic support', state: OfferingState.LIVE },
  { name: 'Integration Express', purpose: 'Quick-start integration package', state: OfferingState.DRAFT },
  { name: 'Managed Services Premium', purpose: 'Full managed operations with SLA guarantees', state: OfferingState.LIVE },
];

export async function seedOfferings(service: OfferingsService, deps: OfferingDeps) {
  const offerings: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < OFFERINGS.length; i++) {
    const data = OFFERINGS[i];
    const agent = deps.agents[i % deps.agents.length];
    const valueStream = deps.valueStreams.all[i % deps.valueStreams.all.length];

    // Each offering gets 2 components from available values
    const comp1 = deps.values[i % deps.values.length];
    const comp2 = deps.values[(i + 1) % deps.values.length];

    const offering = await service.create({
      name: data.name,
      purpose: data.purpose,
      description: faker.lorem.paragraph(),
      state: data.state,
      agentId: agent.id,
      valueStreamId: valueStream.id,
      components: [
        { valueId: comp1.id, quantity: '1.00', pricingFormula: `${faker.number.int({ min: 500, max: 5000 })}.00` },
        { valueId: comp2.id, quantity: '2.00', pricingFormula: `${faker.number.int({ min: 100, max: 2000 })}.00` },
      ],
    });
    offerings.push({ id: offering.id, name: offering.name });
  }

  return offerings;
}
