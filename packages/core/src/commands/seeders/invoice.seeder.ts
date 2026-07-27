import { AgentType, InvoiceMarket } from '@marketlum/shared';
import { faker } from '@faker-js/faker';
import { InvoicesService } from '../../invoices/invoices.service';

interface ValueRef {
  id: string;
  name: string;
}

interface InvoiceDeps {
  agents: Array<{ id: string; name: string; type: AgentType }>;
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

  const invoices: Array<{ id: string; number: string; currencyId: string }> = [];

  for (let i = 0; i < NUM_INVOICES; i++) {
    // Mostly external counterparty trade, with some internal-market invoices.
    const market = faker.helpers.weightedArrayElement([
      { weight: 7, value: InvoiceMarket.EXTERNAL },
      { weight: 3, value: InvoiceMarket.INTERNAL },
    ]);

    // Only legal entities may issue external invoices (spec 022).
    const issuerChoices =
      market === InvoiceMarket.EXTERNAL
        ? deps.agents.filter((a) => a.type !== AgentType.VIRTUAL)
        : deps.agents;
    const fromAgent = faker.helpers.arrayElement(issuerChoices);
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
      market,
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      paid: faker.datatype.boolean(),
      items,
    });
    invoices.push({ id: invoice.id, number, currencyId: currency.id });
  }

  // On-behalf example (spec 022): TechNova Solutions invoices a customer for
  // work done by its virtual Support Desk team — the service auto-generates
  // the internal mirror invoice (MIR-…) from the team to TechNova.
  const technova = deps.agents.find((a) => a.name === 'TechNova Solutions');
  const supportDesk = deps.agents.find((a) => a.name === 'TechNova Support Desk');
  const customer = deps.agents.find((a) => a.name === 'Acme Corp');
  if (technova && supportDesk && customer && lineValues.length > 0) {
    const issuedAt = new Date(Date.UTC(2026, 2, 12));
    const dueAt = new Date(Date.UTC(2026, 3, 11));
    const onBehalf = await service.create({
      number: 'INV-2026-OBH-0001',
      fromAgentId: technova.id,
      toAgentId: customer.id,
      currencyId: currencies[0].id,
      market: InvoiceMarket.EXTERNAL,
      onBehalfOfAgentId: supportDesk.id,
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      paid: false,
      items: [
        {
          valueId: lineValues[0].id,
          quantity: '1.00',
          unitPrice: '4800.00',
          total: '4800.00',
        },
      ],
    });
    invoices.push({
      id: onBehalf.id,
      number: onBehalf.number,
      currencyId: currencies[0].id,
    });
  }

  return invoices;
}
