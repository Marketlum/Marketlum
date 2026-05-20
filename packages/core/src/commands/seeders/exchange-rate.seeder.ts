import { ExchangeRatesService } from '../../exchange-rates/exchange-rates.service';

interface RateSeed {
  fromName: string;
  toName: string;
  rate: string;
  source: string;
}

const RATE_SEEDS: RateSeed[] = [
  { fromName: 'USD', toName: 'EUR', rate: '0.9200000000', source: 'ECB' },
  { fromName: 'USD', toName: 'GBP', rate: '0.7900000000', source: 'ECB' },
  { fromName: 'USD', toName: 'PLN', rate: '4.0000000000', source: 'NBP' },
  { fromName: 'EUR', toName: 'GBP', rate: '0.8600000000', source: 'ECB' },
  { fromName: 'EUR', toName: 'PLN', rate: '4.3500000000', source: 'NBP' },
  { fromName: 'GBP', toName: 'PLN', rate: '5.0500000000', source: 'NBP' },
  { fromName: 'USD', toName: 'Hour of consulting', rate: '0.0050000000', source: 'Manual' },
];

interface ValueRef {
  id: string;
  name: string;
}

export async function seedExchangeRates(
  service: ExchangeRatesService,
  deps: { values: ValueRef[] },
) {
  const byName = new Map(deps.values.map((v) => [v.name, v]));
  const created: Array<{ id: string }> = [];

  // Seed rates effective from the start of the seeded invoice year so any
  // invoice issued in 2026 finds an applicable rate (lookup is effectiveAt
  // <= issuedAt).
  const effectiveAt = new Date(Date.UTC(2025, 11, 31)).toISOString();

  for (const seed of RATE_SEEDS) {
    const from = byName.get(seed.fromName);
    const to = byName.get(seed.toName);
    if (!from || !to) continue;

    const rate = await service.create({
      fromValueId: from.id,
      toValueId: to.id,
      rate: seed.rate,
      effectiveAt,
      source: seed.source,
    });
    created.push({ id: rate.id });
  }

  return created;
}
