import { faker } from '@faker-js/faker';
import { InvoicesService } from '../../invoices/invoices.service';

interface InvoiceDeps {
  agents: Array<{ id: string }>;
  values: Array<{ id: string }>;
  valueStreams: { all: Array<{ id: string }> };
}

export async function seedInvoices(service: InvoicesService, deps: InvoiceDeps) {
  const invoices: Array<{ id: string; number: string }> = [];

  for (let i = 0; i < 4; i++) {
    const fromAgent = deps.agents[i % deps.agents.length];
    const toAgent = deps.agents[(i + 1) % deps.agents.length];
    const currency = deps.values[0]; // Use first value as currency reference
    const valueStream = deps.valueStreams.all[i % deps.valueStreams.all.length];

    const unitPrice1 = faker.number.int({ min: 100, max: 5000 });
    const qty1 = faker.number.int({ min: 1, max: 10 });
    const unitPrice2 = faker.number.int({ min: 50, max: 1000 });
    const qty2 = faker.number.int({ min: 1, max: 5 });

    const invoice = await service.create({
      number: `INV-2026-${String(i + 1).padStart(4, '0')}`,
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
      currencyId: currency.id,
      issuedAt: new Date(2026, 0 + i, 15).toISOString(),
      dueAt: new Date(2026, 1 + i, 15).toISOString(),
      paid: i < 2, // First two are paid
      valueStreamId: valueStream.id,
      items: [
        {
          valueId: deps.values[i % deps.values.length].id,
          quantity: `${qty1}.00`,
          unitPrice: `${unitPrice1}.00`,
          total: `${qty1 * unitPrice1}.00`,
        },
        {
          valueId: deps.values[(i + 1) % deps.values.length].id,
          quantity: `${qty2}.00`,
          unitPrice: `${unitPrice2}.00`,
          total: `${qty2 * unitPrice2}.00`,
        },
      ],
    });
    invoices.push({ id: invoice.id, number: `INV-2026-${String(i + 1).padStart(4, '0')}` });
  }

  return invoices;
}
