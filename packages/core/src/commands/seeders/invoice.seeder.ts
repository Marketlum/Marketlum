import { faker } from '@faker-js/faker';
import { InvoicesService } from '../../invoices/invoices.service';

interface ValueRef {
  id: string;
  name: string;
}

interface InvoiceDeps {
  agents: Array<{ id: string; name: string }>;
  values: ValueRef[];
}

const CURRENCY_NAMES = ['USD', 'EUR', 'PLN', 'GBP'] as const;
const NUM_INVOICES = 45;

export async function seedInvoices(service: InvoicesService, deps: InvoiceDeps) {
  faker.seed(42);

  const currencies = deps.values.filter((v) =>
    (CURRENCY_NAMES as readonly string[]).includes(v.name),
  );
  if (currencies.length === 0) {
    throw new Error('seedInvoices: no currency values found');
  }
  const lineValues = deps.values.filter(
    (v) => !(CURRENCY_NAMES as readonly string[]).includes(v.name),
  );

  const invoices: Array<{ id: string; number: string }> = [];

  for (let i = 0; i < NUM_INVOICES; i++) {
    const fromAgent = faker.helpers.arrayElement(deps.agents);
    const toAgentChoices = deps.agents.filter((a) => a.id !== fromAgent.id);
    const toAgent = faker.helpers.arrayElement(toAgentChoices);
    const currency = faker.helpers.arrayElement(currencies);

    const month = faker.number.int({ min: 0, max: 11 });
    const day = faker.number.int({ min: 1, max: 28 });
    const issuedAt = new Date(Date.UTC(2026, month, day));
    const dueAt = new Date(issuedAt);
    dueAt.setUTCDate(dueAt.getUTCDate() + 30);

    const itemCount = faker.number.int({ min: 1, max: 3 });
    const items = Array.from({ length: itemCount }, () => {
      const qty = faker.number.int({ min: 1, max: 10 });
      const unitPrice = faker.number.int({ min: 50, max: 5000 });
      return {
        valueId: faker.helpers.arrayElement(lineValues).id,
        quantity: `${qty}.00`,
        unitPrice: `${unitPrice}.00`,
        total: `${qty * unitPrice}.00`,
      };
    });

    const number = `INV-2026-${String(i + 1).padStart(4, '0')}`;
    const invoice = await service.create({
      number,
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
      currencyId: currency.id,
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      paid: faker.datatype.boolean(),
      items,
    });
    invoices.push({ id: invoice.id, number });
  }

  return invoices;
}
