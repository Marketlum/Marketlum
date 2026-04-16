import { faker } from '@faker-js/faker';
import { TaxonomiesService } from '../../taxonomies/taxonomies.service';

const ROOT_TAXONOMIES = [
  'Market Segments',
  'Industries',
  'Capabilities',
  'Technologies',
];

const CHILDREN: Record<string, string[]> = {
  'Market Segments': ['Enterprise', 'Mid-Market', 'SMB'],
  'Industries': ['Financial Services', 'Healthcare', 'Manufacturing'],
  'Capabilities': ['Analytics', 'Automation', 'Integration'],
  'Technologies': ['Cloud', 'AI/ML', 'Blockchain'],
};

export async function seedTaxonomies(service: TaxonomiesService) {
  const roots: Array<{ id: string; name: string }> = [];
  const children: Array<{ id: string; name: string }> = [];

  for (const name of ROOT_TAXONOMIES) {
    const taxonomy = await service.create({
      name,
      description: faker.lorem.sentence(),
    });
    roots.push({ id: taxonomy.id, name: taxonomy.name });

    for (const childName of CHILDREN[name]) {
      const child = await service.create({
        name: childName,
        description: faker.lorem.sentence(),
        parentId: taxonomy.id,
      });
      children.push({ id: child.id, name: child.name });
    }
  }

  return { roots, children, all: [...roots, ...children] };
}
