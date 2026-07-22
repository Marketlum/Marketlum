import { faker } from '@faker-js/faker';
import { OrderTransitionAction } from '@marketlum/shared';
import { OrdersService } from '../../orders/orders.service';
import { InvoicesService } from '../../invoices/invoices.service';

interface OrderDeps {
  agents: Array<{ id: string; name: string }>;
  values: Array<{ id: string; name: string }>;
  channels: Array<{ id: string }>;
  pipelines: Array<{ id: string }>;
  locales: Array<{ id: string }>;
  invoices: Array<{ id: string; currencyId: string }>;
}

const CURRENCY_NAMES = ['USD', 'EUR', 'PLN', 'GBP'] as const;
const NUM_ORDERS = 30;

const COUNTRY_CODES = ['US', 'DE', 'PL', 'GB', 'FR', 'NL'] as const;

function sampleAddress() {
  return {
    countryCode: faker.helpers.arrayElement(COUNTRY_CODES),
    line1: faker.location.streetAddress(),
    line2: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
    city: faker.location.city(),
    postalCode: faker.location.zipCode('#####'),
  };
}

/** draft stays put; the other states are reached through real transitions. */
const STATE_PATHS: Array<{ weight: number; value: OrderTransitionAction[] }> = [
  { weight: 5, value: [] },
  { weight: 5, value: [OrderTransitionAction.PLACE] },
  { weight: 8, value: [OrderTransitionAction.PLACE, OrderTransitionAction.START] },
  {
    weight: 9,
    value: [
      OrderTransitionAction.PLACE,
      OrderTransitionAction.START,
      OrderTransitionAction.COMPLETE,
    ],
  },
  { weight: 3, value: [OrderTransitionAction.PLACE, OrderTransitionAction.CANCEL] },
];

export async function seedOrders(
  service: OrdersService,
  invoicesService: InvoicesService,
  deps: OrderDeps,
) {
  faker.seed(43);

  const currencies = deps.values.filter((v) =>
    (CURRENCY_NAMES as readonly string[]).includes(v.name),
  );
  if (currencies.length === 0) {
    throw new Error('seedOrders: no currency values found');
  }
  const lineValues = deps.values.filter(
    (v) => !(CURRENCY_NAMES as readonly string[]).includes(v.name),
  );

  const unlinkedInvoices = [...deps.invoices];
  const orders: Array<{ id: string; number: string }> = [];

  for (let i = 0; i < NUM_ORDERS; i++) {
    const fromAgent = faker.helpers.arrayElement(deps.agents);
    const toAgent = faker.helpers.arrayElement(
      deps.agents.filter((a) => a.id !== fromAgent.id),
    );
    const currency = faker.helpers.arrayElement(currencies);
    const withContext = faker.number.int({ min: 1, max: 3 }) > 1;

    const itemCount = faker.number.int({ min: 1, max: 4 });
    const items = Array.from({ length: itemCount }, () => ({
      valueId: faker.helpers.arrayElement(lineValues).id,
      quantity: `${faker.number.int({ min: 1, max: 10 })}.00`,
      unitPrice: `${faker.number.int({ min: 50, max: 5000 })}.00`,
    }));

    const order = await service.create({
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
      currencyId: currency.id,
      channelId: withContext ? faker.helpers.arrayElement(deps.channels).id : null,
      pipelineId: withContext ? faker.helpers.arrayElement(deps.pipelines).id : null,
      localeId:
        withContext && deps.locales.length > 0
          ? faker.helpers.arrayElement(deps.locales).id
          : null,
      shippingAddress: sampleAddress(),
      billingAddress: faker.datatype.boolean() ? sampleAddress() : null,
      items,
    });

    const path = faker.helpers.weightedArrayElement(STATE_PATHS);

    // Link currency-matching invoices while the order is still linkable
    // (linking is rejected once the order reaches a final state).
    if (path.length > 1) {
      const matching = unlinkedInvoices.filter(
        (invoice) => invoice.currencyId === currency.id,
      );
      const toLink = matching.slice(0, faker.number.int({ min: 0, max: 2 }));
      for (const invoice of toLink) {
        await invoicesService.update(invoice.id, { orderId: order.id });
        unlinkedInvoices.splice(unlinkedInvoices.indexOf(invoice), 1);
      }
    }

    for (const action of path) {
      await service.transition(order.id, action);
    }

    orders.push({ id: order.id, number: order.number });
  }

  return orders;
}
