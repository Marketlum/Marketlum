import { AgentsService } from '../../agents/agents.service';
import { AddressesService } from '../../agents/addresses/addresses.service';
import { AgentType } from '@marketlum/shared';

interface AgentDeps {
  taxonomies: { all: Array<{ id: string }> };
  countries: Array<{ id: string; name: string }>;
}

const AGENTS = [
  { name: 'Acme Corp', type: AgentType.ORGANIZATION, purpose: 'Global manufacturing and distribution' },
  { name: 'TechNova Solutions', type: AgentType.ORGANIZATION, purpose: 'Cloud infrastructure provider' },
  { name: 'GreenLeaf Partners', type: AgentType.ORGANIZATION, purpose: 'Sustainable supply chain consulting' },
  { name: 'Sarah Palmer', type: AgentType.INDIVIDUAL, purpose: 'Independent market analyst' },
  { name: 'James Liu', type: AgentType.INDIVIDUAL, purpose: 'Freelance integration specialist' },
  { name: 'AutoFlow Bot', type: AgentType.VIRTUAL, purpose: 'Automated order processing agent' },
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

    const agent = await service.create({
      name: agentData.name,
      type: agentData.type,
      purpose: agentData.purpose,
      mainTaxonomyId: taxonomy.id,
    });
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
