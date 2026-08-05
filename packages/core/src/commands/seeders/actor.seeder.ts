import { AgentsService } from '../../agents/agents.service';
import { AddressesService } from '../../agents/addresses/addresses.service';
import { AgentType, CreateAgentInput } from '@marketlum/shared';

interface AgentDeps {
  taxonomies: { all: Array<{ id: string }> };
  countries: Array<{ id: string; name: string }>;
  functionalCurrencyByAgentName?: Record<string, string>;
}

// Parents must appear before their children: the seeder resolves parentName
// against agents created earlier in this list (spec 015 sample hierarchy).
// The first six names are load-bearing — exchange/tension/value/value-instance
// seeders and the functional-currency map look them up by name.
const AGENTS: Array<{
  name: string;
  type: AgentType;
  purpose: string;
  parentName?: string;
}> = [
  // --- Root organizations ---
  { name: 'Acme Corp', type: AgentType.ORGANIZATION, purpose: 'Global manufacturing and distribution' },
  { name: 'TechNova Solutions', type: AgentType.ORGANIZATION, purpose: 'Cloud infrastructure provider' },
  { name: 'GreenLeaf Partners', type: AgentType.ORGANIZATION, purpose: 'Sustainable supply chain consulting' },
  { name: 'Meridian Logistics Group', type: AgentType.ORGANIZATION, purpose: 'Intermodal freight and last-mile delivery' },
  { name: 'Bluewater Capital', type: AgentType.ORGANIZATION, purpose: 'Growth investments in industrial technology' },
  { name: 'Helios Energy Cooperative', type: AgentType.ORGANIZATION, purpose: 'Community-owned renewable energy projects' },
  { name: 'Kite & Anchor Studio', type: AgentType.ORGANIZATION, purpose: 'Brand design and product storytelling' },
  { name: 'Northwind Manufacturing', type: AgentType.ORGANIZATION, purpose: 'Precision components for heavy industry' },
  { name: 'Sakura Trading House', type: AgentType.ORGANIZATION, purpose: 'Cross-border wholesale and import services' },
  { name: 'Alpine Data Works', type: AgentType.ORGANIZATION, purpose: 'Analytics platforms for regulated industries' },
  // --- Subsidiary organizations ---
  { name: 'Acme Poland', type: AgentType.ORGANIZATION, purpose: 'Central European operations of Acme Corp', parentName: 'Acme Corp' },
  { name: 'Acme Nordics', type: AgentType.ORGANIZATION, purpose: 'Scandinavian sales and service of Acme Corp', parentName: 'Acme Corp' },
  { name: 'Meridian Iberia', type: AgentType.ORGANIZATION, purpose: 'Iberian road network of Meridian Logistics', parentName: 'Meridian Logistics Group' },
  // --- TechNova virtual sub-agent teams ---
  { name: 'TechNova Support Desk', type: AgentType.VIRTUAL, purpose: 'Tier-1 customer support automation team', parentName: 'TechNova Solutions' },
  { name: 'TechNova DevOps Crew', type: AgentType.VIRTUAL, purpose: 'Deployment and reliability engineering team', parentName: 'TechNova Solutions' },
  { name: 'TechNova Data Platform Team', type: AgentType.VIRTUAL, purpose: 'Ingestion pipelines and warehouse operations', parentName: 'TechNova Solutions' },
  { name: 'TechNova Security Response', type: AgentType.VIRTUAL, purpose: 'Threat monitoring and incident response', parentName: 'TechNova Solutions' },
  { name: 'TechNova Onboarding Bots', type: AgentType.VIRTUAL, purpose: 'Automated tenant provisioning workflows', parentName: 'TechNova Solutions' },
  // --- Other virtual agents ---
  { name: 'AutoFlow Bot', type: AgentType.VIRTUAL, purpose: 'Automated order processing agent', parentName: 'Acme Corp' },
  { name: 'GreenLeaf Audit Team', type: AgentType.VIRTUAL, purpose: 'Supplier sustainability scoring team', parentName: 'GreenLeaf Partners' },
  { name: 'Meridian Freight Analytics', type: AgentType.VIRTUAL, purpose: 'Route and load optimization models', parentName: 'Meridian Logistics Group' },
  { name: 'Helios Grid Watch', type: AgentType.VIRTUAL, purpose: 'Production and grid balancing telemetry', parentName: 'Helios Energy Cooperative' },
  { name: 'Northwind Assembly Line Bot', type: AgentType.VIRTUAL, purpose: 'Shop-floor scheduling automation', parentName: 'Northwind Manufacturing' },
  { name: 'Sakura Customs Broker Bot', type: AgentType.VIRTUAL, purpose: 'Automated customs declarations', parentName: 'Sakura Trading House' },
  { name: 'Alpine ETL Pipeline', type: AgentType.VIRTUAL, purpose: 'Managed data ingestion service', parentName: 'Alpine Data Works' },
  { name: 'Ledger Reconciliation Bot', type: AgentType.VIRTUAL, purpose: 'Independent settlement reconciliation service' },
  { name: 'Market Pulse Crawler', type: AgentType.VIRTUAL, purpose: 'Market signal aggregation service' },
  // --- Individuals inside organizations ---
  { name: 'Sarah Palmer', type: AgentType.INDIVIDUAL, purpose: 'Independent market analyst', parentName: 'Acme Corp' },
  { name: 'James Liu', type: AgentType.INDIVIDUAL, purpose: 'Freelance integration specialist', parentName: 'TechNova Solutions' },
  { name: 'Piotr Nowak', type: AgentType.INDIVIDUAL, purpose: 'Plant operations manager', parentName: 'Acme Poland' },
  { name: 'Anna Wiśniewska', type: AgentType.INDIVIDUAL, purpose: 'Regional key account manager', parentName: 'Acme Poland' },
  { name: 'Freja Lindqvist', type: AgentType.INDIVIDUAL, purpose: 'Nordic partnerships lead', parentName: 'Acme Nordics' },
  { name: 'Carlos Mendez', type: AgentType.INDIVIDUAL, purpose: 'Fleet coordinator', parentName: 'Meridian Iberia' },
  { name: 'Nina Petrova', type: AgentType.INDIVIDUAL, purpose: 'Investment analyst', parentName: 'Bluewater Capital' },
  { name: 'Maria Santos', type: AgentType.INDIVIDUAL, purpose: 'Circular economy consultant', parentName: 'GreenLeaf Partners' },
  { name: 'Kenji Watanabe', type: AgentType.INDIVIDUAL, purpose: 'Sourcing director', parentName: 'Sakura Trading House' },
  { name: 'Lena Hoffmann', type: AgentType.INDIVIDUAL, purpose: 'Compliance data architect', parentName: 'Alpine Data Works' },
  // --- Independent individuals ---
  { name: 'Tomás Oliveira', type: AgentType.INDIVIDUAL, purpose: 'Freelance logistics auditor' },
  { name: 'Aisha Bello', type: AgentType.INDIVIDUAL, purpose: 'Trade finance advisor' },
  { name: 'David Chen', type: AgentType.INDIVIDUAL, purpose: 'Independent hardware prototyper' },
  { name: 'Ingrid Johansson', type: AgentType.INDIVIDUAL, purpose: 'Sustainability reporting specialist' },
  { name: 'Rafael Costa', type: AgentType.INDIVIDUAL, purpose: 'Contract manufacturing broker' },
  { name: 'Chloe Martin', type: AgentType.INDIVIDUAL, purpose: 'Freelance UX researcher' },
  { name: 'Omar Haddad', type: AgentType.INDIVIDUAL, purpose: 'Customs and tariffs consultant' },
  { name: 'Elena Rossi', type: AgentType.INDIVIDUAL, purpose: 'Interim CFO for scale-ups' },
  { name: "Jack O'Brien", type: AgentType.INDIVIDUAL, purpose: 'Field service engineer' },
  { name: 'Yuki Tanaka', type: AgentType.INDIVIDUAL, purpose: 'Localization project manager' },
  { name: 'Priya Sharma', type: AgentType.INDIVIDUAL, purpose: 'Procurement negotiator' },
  { name: 'Sofia Almeida', type: AgentType.INDIVIDUAL, purpose: 'Renewable energy project developer' },
  { name: 'Ewa Kamińska', type: AgentType.INDIVIDUAL, purpose: 'Independent legal counsel' },
];

interface AddressSeed {
  label: string;
  line1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  isPrimary: boolean;
  latitude: string;
  longitude: string;
}

const ADDRESSES: Record<string, AddressSeed[]> = {
  'Acme Corp': [
    { label: 'HQ', line1: 'ul. Marszałkowska 1', city: 'Warszawa', postalCode: '00-001', countryCode: 'PL', isPrimary: true, latitude: '52.2296756', longitude: '21.0122287' },
    { label: 'Berlin office', line1: 'Friedrichstr. 1', city: 'Berlin', postalCode: '10117', countryCode: 'DE', isPrimary: false, latitude: '52.5170365', longitude: '13.3888599' },
  ],
  'TechNova Solutions': [
    { label: 'HQ', line1: '350 Mission St', city: 'San Francisco', postalCode: '94105', countryCode: 'US', isPrimary: true, latitude: '37.7886941', longitude: '-122.3939138' },
  ],
  'GreenLeaf Partners': [
    { label: 'HQ', line1: '1 Long Acre', city: 'London', postalCode: 'WC2E 9LH', countryCode: 'GB', isPrimary: true, latitude: '51.5128396', longitude: '-0.1240489' },
    { label: 'Warehouse', line1: 'ul. Hutnicza 5', city: 'Gdańsk', postalCode: '80-871', countryCode: 'PL', isPrimary: false, latitude: '54.3520252', longitude: '18.6466384' },
  ],
  'Meridian Logistics Group': [
    { label: 'HQ', line1: 'Speicherstadt 12', city: 'Hamburg', postalCode: '20457', countryCode: 'DE', isPrimary: true, latitude: '53.5432127', longitude: '9.9922345' },
  ],
  'Bluewater Capital': [
    { label: 'HQ', line1: '200 Park Ave', city: 'New York', postalCode: '10166', countryCode: 'US', isPrimary: true, latitude: '40.7539653', longitude: '-73.9761677' },
  ],
  'Helios Energy Cooperative': [
    { label: 'HQ', line1: '45 Rue de la Villette', city: 'Lyon', postalCode: '69003', countryCode: 'FR', isPrimary: true, latitude: '45.7607882', longitude: '4.8590743' },
  ],
  'Kite & Anchor Studio': [
    { label: 'Studio', line1: '30 Cecil St', city: 'Singapore', postalCode: '049712', countryCode: 'SG', isPrimary: true, latitude: '1.2818542', longitude: '103.8496305' },
  ],
  'Northwind Manufacturing': [
    { label: 'Plant', line1: '233 S Wacker Dr', city: 'Chicago', postalCode: '60606', countryCode: 'US', isPrimary: true, latitude: '41.8788764', longitude: '-87.6359149' },
  ],
  'Sakura Trading House': [
    { label: 'HQ', line1: '1-9-1 Marunouchi', city: 'Tokyo', postalCode: '100-0005', countryCode: 'JP', isPrimary: true, latitude: '35.6812362', longitude: '139.7671248' },
  ],
  'Alpine Data Works': [
    { label: 'HQ', line1: 'Leopoldstr. 27', city: 'München', postalCode: '80802', countryCode: 'DE', isPrimary: true, latitude: '48.1548898', longitude: '11.5811628' },
  ],
  'Acme Poland': [
    { label: 'Office', line1: 'ul. Piotrkowska 100', city: 'Łódź', postalCode: '90-004', countryCode: 'PL', isPrimary: true, latitude: '51.7660978', longitude: '19.4568759' },
  ],
};

export async function seedAgents(
  service: AgentsService,
  addressesService: AddressesService,
  deps: AgentDeps,
) {
  const agents: Array<{ id: string; name: string; type: AgentType }> = [];
  const nameToCode: Record<string, string> = {
    Poland: 'PL', Germany: 'DE', France: 'FR', 'United Kingdom': 'GB',
    'United States': 'US', Canada: 'CA', Japan: 'JP', Singapore: 'SG',
  };
  const countryIdByCode: Record<string, string> = {};
  for (const c of deps.countries) {
    const code = nameToCode[c.name];
    if (code) countryIdByCode[code] = c.id;
  }

  for (let i = 0; i < AGENTS.length; i++) {
    const agentData = AGENTS[i];
    const taxonomy = deps.taxonomies.all[i % deps.taxonomies.all.length];

    const parentId = agentData.parentName
      ? agents.find((a) => a.name === agentData.parentName)?.id
      : undefined;

    const agent = await service.create({
      name: agentData.name,
      type: agentData.type,
      purpose: agentData.purpose,
      mainTaxonomyId: taxonomy.id,
      functionalCurrencyId: deps.functionalCurrencyByAgentName?.[agentData.name],
      parentId,
    } as unknown as CreateAgentInput);
    agents.push({ id: agent.id, name: agent.name, type: agentData.type });

    const addresses = ADDRESSES[agentData.name] ?? [];
    for (const a of addresses) {
      const countryId = countryIdByCode[a.countryCode];
      if (!countryId) continue;
      await addressesService.create(
        agent.id,
        {
          label: a.label,
          line1: a.line1,
          city: a.city,
          postalCode: a.postalCode,
          countryId,
          isPrimary: a.isPrimary,
        },
        { skipGeocode: true, latitude: a.latitude, longitude: a.longitude },
      );
    }
  }

  return agents;
}
