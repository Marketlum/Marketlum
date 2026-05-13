import { faker } from '@faker-js/faker';
import {
  CreateRecurringFlowInput,
  RecurringFlowDirection,
  RecurringFlowFrequency,
  RecurringFlowTransitionAction,
} from '@marketlum/shared';
import { RecurringFlowsService } from '../../recurring-flows/recurring-flows.service';

interface ValueRef {
  id: string;
  name: string;
}

interface RecurringFlowDeps {
  valueStreams: Array<{ id: string; name: string }>;
  agents: Array<{ id: string; name: string }>;
  values: ValueRef[];
}

// Names matching the values that get exchange rates seeded against the system
// base (USD). Restricting picks to this set guarantees every seeded flow has a
// resolvable baseAmount snapshot.
const SNAPSHOT_VALUE_NAMES = ['USD', 'EUR', 'GBP', 'Hour of consulting'];

const FREQUENCIES: RecurringFlowFrequency[] = [
  RecurringFlowFrequency.MONTHLY,
  RecurringFlowFrequency.MONTHLY,
  RecurringFlowFrequency.MONTHLY,
  RecurringFlowFrequency.QUARTERLY,
  RecurringFlowFrequency.YEARLY,
];

function randomISODateInPast(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - faker.number.int({ min: 1, max: months }));
  d.setUTCDate(faker.number.int({ min: 1, max: 28 }));
  return d.toISOString().slice(0, 10);
}

export async function seedRecurringFlows(
  service: RecurringFlowsService,
  deps: RecurringFlowDeps,
) {
  const flows: Array<{ id: string }> = [];
  const eligibleValues = deps.values.filter((v) => SNAPSHOT_VALUE_NAMES.includes(v.name));
  // Fall back to whatever values exist if none of the named ones are present
  // (lets the seeder still produce flows in oddly-customized setups).
  const valuePool = eligibleValues.length > 0 ? eligibleValues : deps.values;

  for (const stream of deps.valueStreams) {
    const flowsForStream = faker.number.int({ min: 3, max: 5 });

    for (let i = 0; i < flowsForStream; i++) {
      const agent = faker.helpers.arrayElement(deps.agents);
      const direction = i % 2 === 0 ? RecurringFlowDirection.INBOUND : RecurringFlowDirection.OUTBOUND;
      const valueRef = faker.helpers.arrayElement(valuePool);
      const frequency = faker.helpers.arrayElement(FREQUENCIES);
      const interval = faker.helpers.weightedArrayElement([
        { weight: 7, value: 1 },
        { weight: 2, value: 2 },
        { weight: 1, value: 3 },
      ]);

      const isMoney = ['USD', 'EUR', 'GBP', 'PLN', 'BTC'].includes(valueRef.name);
      const amount = isMoney
        ? faker.number.int({ min: 100, max: 12000 }).toString()
        : faker.number.int({ min: 1, max: 40 }).toString();

      const input: CreateRecurringFlowInput = {
        valueStreamId: stream.id,
        counterpartyAgentId: agent.id,
        valueId: valueRef.id,
        direction,
        amount,
        unit: valueRef.name.length > 32 ? valueRef.name.slice(0, 32) : valueRef.name,
        frequency,
        interval,
        startDate: randomISODateInPast(18),
      };

      const flow = await service.create(input);

      // Activate most flows; leave one in draft per stream; end one occasionally
      if (i === 0) {
        // first flow stays draft
      } else if (i === flowsForStream - 1 && Math.random() < 0.3) {
        await service.transition(flow.id, RecurringFlowTransitionAction.ACTIVATE);
        await service.transition(flow.id, RecurringFlowTransitionAction.END);
      } else if (Math.random() < 0.15) {
        await service.transition(flow.id, RecurringFlowTransitionAction.ACTIVATE);
        await service.transition(flow.id, RecurringFlowTransitionAction.PAUSE);
      } else {
        await service.transition(flow.id, RecurringFlowTransitionAction.ACTIVATE);
      }

      flows.push({ id: flow.id });
    }
  }

  return flows;
}
