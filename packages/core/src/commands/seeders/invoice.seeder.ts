import { faker } from '@faker-js/faker';
import { InvoiceDirection } from '@marketlum/shared';
import { InvoicesService } from '../../invoices/invoices.service';

interface ValueRef {
  id: string;
  name: string;
}

interface InvoiceDeps {
  agents: Array<{ id: string; name: string }>;
  values: ValueRef[];
  valueStreams: { all: Array<{ id: string }> };
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
    const valueStream = faker.helpers.arrayElement(deps.valueStreams.all);

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

    // Themed mix: most invoices are sales/output (revenue), the rest are
    // supplier/material/service costs (expense) — so each value stream's
    // Financials tab shows a realistic revenue/expense/net split.
    const direction = faker.helpers.weightedArrayElement([
      { weight: 6, value: InvoiceDirection.REVENUE },
      { weight: 4, value: InvoiceDirection.EXPENSE },
    ]);

    const number = `INV-2026-${String(i + 1).padStart(4, '0')}`;
    const invoice = await service.create({
      number,
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
      currencyId: currency.id,
      direction,
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      paid: faker.datatype.boolean(),
      valueStreamId: valueStream.id,
      items,
    });
    invoices.push({ id: invoice.id, number });
  }

  return invoices;
}
