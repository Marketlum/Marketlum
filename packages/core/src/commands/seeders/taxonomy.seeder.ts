import { faker } from '@faker-js/faker';
import { TaxonomiesService } from '../../taxonomies/taxonomies.service';

const ROOTS: Array<{ code: string; name: string }> = [
  { code: 'market_segments', name: 'Market Segments' },
  { code: 'industries', name: 'Industries' },
  { code: 'capabilities', name: 'Capabilities' },
  { code: 'technologies', name: 'Technologies' },
];

const CHILDREN: Record<string, Array<{ code: string; name: string }>> = {
  market_segments: [
    { code: 'market_segments_enterprise', name: 'Enterprise' },
    { code: 'market_segments_mid_market', name: 'Mid-Market' },
    { code: 'market_segments_smb', name: 'SMB' },
  ],
  industries: [
    { code: 'industries_financial_services', name: 'Financial Services' },
    { code: 'industries_healthcare', name: 'Healthcare' },
    { code: 'industries_manufacturing', name: 'Manufacturing' },
  ],
  capabilities: [
    { code: 'capabilities_analytics', name: 'Analytics' },
    { code: 'capabilities_automation', name: 'Automation' },
    { code: 'capabilities_integration', name: 'Integration' },
  ],
  technologies: [
    { code: 'technologies_cloud', name: 'Cloud' },
    { code: 'technologies_ai_ml', name: 'AI/ML' },
    { code: 'technologies_blockchain', name: 'Blockchain' },
  ],
};

export async function seedTaxonomies(service: TaxonomiesService) {
  const roots: Array<{ id: string; name: string }> = [];
  const children: Array<{ id: string; name: string }> = [];

  for (const root of ROOTS) {
    const taxonomy = await service.create({
      code: root.code,
      name: root.name,
      description: faker.lorem.sentence(),
    });
    roots.push({ id: taxonomy.id, name: taxonomy.name });

    for (const child of CHILDREN[root.code]) {
      const created = await service.create({
        code: child.code,
        name: child.name,
        description: faker.lorem.sentence(),
        parentId: taxonomy.id,
      });
      children.push({ id: created.id, name: created.name });
    }
  }

  return { roots, children, all: [...roots, ...children] };
}
