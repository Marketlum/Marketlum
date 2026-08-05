import { faker } from '@faker-js/faker';
import { ExchangeTransitionAction } from '@marketlum/shared';
import { ExchangesService } from '../../exchanges/exchanges.service';
import { ExchangeFlowsService } from '../../exchanges/exchange-flows.service';

interface ExchangeDeps {
  actors: Array<{ id: string; name: string }>;
  values: Array<{ id: string; name: string }>;
  valueStreams: { all: Array<{ id: string; code: string }> };
  channels: { all: Array<{ id: string }> };
  pipelines: Array<{ id: string }>;
  users: Array<{ id: string }>;
  tensions: Array<{ id: string }>;
}

interface ExchangeSeed {
  name: string;
  purpose: string;
  sellerActor: string;        // actor.name — provides the product/service/right
  buyerActor: string;         // actor.name — pays in currency
  productValue: string;       // value.name being transferred from seller to buyer
  productQuantity: string;    // e.g. '10000.00'
  paymentCurrency: string;    // value.name of the currency
  paymentQuantity: string;    // e.g. '45000.00'
  valueStreamCode: string;    // value-stream.code to attach the exchange to
  transition?: ExchangeTransitionAction; // optional state advance from OPEN
}

// Battery-value-chain themed deals. Each exchange has two flows:
// productValue from seller → buyer, and paymentCurrency from buyer → seller.
const EXCHANGES: ExchangeSeed[] = [
  {
    name: 'Battery Cell supply — TechNova Q3 order',
    purpose: 'Long-term cell offtake for TechNova pack assembly line',
    sellerActor: 'Acme Corp',
    buyerActor: 'TechNova Solutions',
    productValue: 'Battery Cell',
    productQuantity: '10000.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '45000.00',
    valueStreamCode: 'batteries_manufacturing',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Battery Module pilot delivery',
    purpose: 'Pilot batch for TechNova prototype validation',
    sellerActor: 'Acme Corp',
    buyerActor: 'TechNova Solutions',
    productValue: 'Battery Module',
    productQuantity: '200.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '180000.00',
    valueStreamCode: 'batteries_manufacturing',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Battery Pack fleet trial — GreenLeaf',
    purpose: 'Fleet trial packs for GreenLeaf demonstration program',
    sellerActor: 'Acme Corp',
    buyerActor: 'GreenLeaf Partners',
    productValue: 'Battery Pack',
    productQuantity: '50.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '750000.00',
    valueStreamCode: 'batteries_manufacturing',
  },
  {
    name: 'Industrial Storage Cabinet — factory deployment',
    purpose: 'Behind-the-meter cabinets for AutoFlow factory peak-shaving',
    sellerActor: 'Acme Corp',
    buyerActor: 'AutoFlow Bot',
    productValue: 'Industrial Storage Cabinet',
    productQuantity: '4.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '480000.00',
    valueStreamCode: 'industrial_implementation',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Grid-Scale Storage Array — utility deal',
    purpose: 'First commercial grid-scale block for AutoFlow utility customer',
    sellerActor: 'Acme Corp',
    buyerActor: 'AutoFlow Bot',
    productValue: 'Grid-Scale Storage Array',
    productQuantity: '1.00',
    paymentCurrency: 'USD',
    paymentQuantity: '2500000.00',
    valueStreamCode: 'industrial_implementation',
  },
  {
    name: 'Site Installation engagement — AutoFlow',
    purpose: 'Turnkey installation of grid-scale block at customer site',
    sellerActor: 'Acme Corp',
    buyerActor: 'AutoFlow Bot',
    productValue: 'Site Installation & Commissioning',
    productQuantity: '1.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '350000.00',
    valueStreamCode: 'industrial_implementation',
  },
  {
    name: 'BMS Firmware OEM license — Acme platform',
    purpose: 'Per-pack BMS firmware license for the next 12 months of production',
    sellerActor: 'TechNova Solutions',
    buyerActor: 'Acme Corp',
    productValue: 'BMS Firmware License',
    productQuantity: '10000.00',
    paymentCurrency: 'USD',
    paymentQuantity: '50000.00',
    valueStreamCode: 'licensing_ecosystem',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Cathode Patent licensing — TechNova',
    purpose: 'Annual field-of-use license to the proprietary NMC811 process',
    sellerActor: 'Acme Corp',
    buyerActor: 'TechNova Solutions',
    productValue: 'Cathode Chemistry Patent Family',
    productQuantity: '1.00',
    paymentCurrency: 'USD',
    paymentQuantity: '1200000.00',
    valueStreamCode: 'licensing_ecosystem',
  },
  {
    name: 'Cathode Material supply contract',
    purpose: 'Quarterly delivery of NMC811 cathode powder',
    sellerActor: 'Acme Corp',
    buyerActor: 'TechNova Solutions',
    productValue: 'Cathode Material',
    productQuantity: '5000.00',
    paymentCurrency: 'USD',
    paymentQuantity: '125000.00',
    valueStreamCode: 'batteries_manufacturing',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Pack Cooling System sub-supply',
    purpose: 'Cold plates and pump assemblies for TechNova pack line',
    sellerActor: 'Acme Corp',
    buyerActor: 'TechNova Solutions',
    productValue: 'Pack Cooling System',
    productQuantity: '200.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '240000.00',
    valueStreamCode: 'batteries_manufacturing',
  },
  {
    name: 'End-of-Life Recycling contract',
    purpose: 'Take-back and material recovery for Acme retired packs',
    sellerActor: 'GreenLeaf Partners',
    buyerActor: 'Acme Corp',
    productValue: 'End-of-Life Recycling',
    productQuantity: '1.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '80000.00',
    valueStreamCode: 'industrial_implementation',
  },
  {
    name: 'Recycled Cathode buyback',
    purpose: 'GreenLeaf-recovered cathode powder reintroduced into Acme line',
    sellerActor: 'GreenLeaf Partners',
    buyerActor: 'Acme Corp',
    productValue: 'Recycled Cathode Material',
    productQuantity: '2000.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '44000.00',
    valueStreamCode: 'batteries_manufacturing',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Cell Chemistry Consulting engagement',
    purpose: 'Independent cycle-life modeling for the next-gen chemistry',
    sellerActor: 'Sarah Palmer',
    buyerActor: 'Acme Corp',
    productValue: 'Cell Chemistry Consulting',
    productQuantity: '80.00',
    paymentCurrency: 'USD',
    paymentQuantity: '24000.00',
    valueStreamCode: 'industrial_implementation',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Installer Certification — James Liu',
    purpose: 'Five-seat certification block for the freelance install crew',
    sellerActor: 'TechNova Solutions',
    buyerActor: 'James Liu',
    productValue: 'Installer Certification Course',
    productQuantity: '5.00',
    paymentCurrency: 'USD',
    paymentQuantity: '12500.00',
    valueStreamCode: 'people',
    transition: ExchangeTransitionAction.COMPLETE,
  },
  {
    name: 'Annual Inspection — Acme deployed fleet',
    purpose: 'Annual inspection sweep across the deployed cabinet fleet',
    sellerActor: 'James Liu',
    buyerActor: 'Acme Corp',
    productValue: 'Annual Inspection',
    productQuantity: '1.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '15000.00',
    valueStreamCode: 'industrial_implementation',
  },
  {
    name: 'Grid Operator Connection Permit transfer',
    purpose: 'Permit assignment to the new operator of the AutoFlow site',
    sellerActor: 'Acme Corp',
    buyerActor: 'AutoFlow Bot',
    productValue: 'Grid Operator Connection Permit',
    productQuantity: '1.00',
    paymentCurrency: 'EUR',
    paymentQuantity: '18000.00',
    valueStreamCode: 'licensing_ecosystem',
    transition: ExchangeTransitionAction.CLOSE,
  },
  {
    name: 'Performance Warranty enrollment',
    purpose: 'Five-year throughput warranty on the AutoFlow utility block',
    sellerActor: 'Acme Corp',
    buyerActor: 'AutoFlow Bot',
    productValue: 'Performance Warranty Service',
    productQuantity: '1.00',
    paymentCurrency: 'USD',
    paymentQuantity: '90000.00',
    valueStreamCode: 'industrial_implementation',
  },
];

export async function seedExchanges(
  exchangesService: ExchangesService,
  flowsService: ExchangeFlowsService,
  deps: ExchangeDeps,
) {
  const actorsByName = new Map(deps.actors.map((a) => [a.name, a]));
  const valuesByName = new Map(deps.values.map((v) => [v.name, v]));
  const valueStreamsByCode = new Map(deps.valueStreams.all.map((vs) => [vs.code, vs]));

  const lookupActor = (name: string) => {
    const actor = actorsByName.get(name);
    if (!actor) throw new Error(`Exchange seeder: missing actor "${name}"`);
    return actor;
  };
  const lookupValue = (name: string) => {
    const value = valuesByName.get(name);
    if (!value) throw new Error(`Exchange seeder: missing value "${name}"`);
    return value;
  };
  const lookupValueStream = (code: string) => {
    const vs = valueStreamsByCode.get(code);
    if (!vs) throw new Error(`Exchange seeder: missing value stream "${code}"`);
    return vs;
  };

  const exchanges: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < EXCHANGES.length; i++) {
    const data = EXCHANGES[i];
    const seller = lookupActor(data.sellerActor);
    const buyer = lookupActor(data.buyerActor);
    const product = lookupValue(data.productValue);
    const currency = lookupValue(data.paymentCurrency);
    const valueStream = lookupValueStream(data.valueStreamCode);

    // The remaining deps stay on simple round-robin since they don't carry
    // semantic theming yet.
    const channel = deps.channels.all[i % deps.channels.all.length];
    const pipeline = deps.pipelines[i % deps.pipelines.length];
    const user = deps.users[i % deps.users.length];
    const tension = deps.tensions[i % deps.tensions.length];

    const exchange = await exchangesService.create({
      name: data.name,
      purpose: data.purpose,
      description: faker.lorem.paragraph(),
      valueStreamId: valueStream.id,
      channelId: channel.id,
      pipelineId: pipeline.id,
      leadUserId: user.id,
      tensionId: tension.id,
      parties: [
        { actorId: seller.id, role: 'Seller' },
        { actorId: buyer.id, role: 'Buyer' },
      ],
    });

    await flowsService.create(exchange.id, {
      valueId: product.id,
      fromActorId: seller.id,
      toActorId: buyer.id,
      quantity: data.productQuantity,
    });

    await flowsService.create(exchange.id, {
      valueId: currency.id,
      fromActorId: buyer.id,
      toActorId: seller.id,
      quantity: data.paymentQuantity,
    });

    if (data.transition) {
      await exchangesService.transition(exchange.id, data.transition);
    }

    exchanges.push({ id: exchange.id, name: exchange.name });
  }

  return exchanges;
}
