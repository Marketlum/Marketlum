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
  { fromName: 'EUR', toName: 'GBP', rate: '0.8600000000', source: 'ECB' },
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

  const now = new Date().toISOString();

  for (const seed of RATE_SEEDS) {
    const from = byName.get(seed.fromName);
    const to = byName.get(seed.toName);
    if (!from || !to) continue;

    const rate = await service.create({
      fromValueId: from.id,
      toValueId: to.id,
      rate: seed.rate,
      effectiveAt: now,
      source: seed.source,
    });
    created.push({ id: rate.id });
  }

  return created;
}
