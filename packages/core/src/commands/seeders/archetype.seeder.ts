import { faker } from '@faker-js/faker';
import { ArchetypesService } from '../../archetypes/archetypes.service';

interface ArchetypeDeps {
  taxonomies: { all: Array<{ id: string }> };
}

const ARCHETYPES = [
  { name: 'Platform Provider', purpose: 'Builds and operates digital platforms', description: 'Organizations that create infrastructure or platforms consumed by other market participants.' },
  { name: 'Value-Added Reseller', purpose: 'Enhances and redistributes value', description: 'Entities that acquire offerings, add value, and resell to end consumers.' },
  { name: 'Market Maker', purpose: 'Facilitates transactions between parties', description: 'Agents who connect supply and demand, enabling exchanges between producers and consumers.' },
  { name: 'End Consumer', purpose: 'Final recipient of value', description: 'The ultimate consumer of products, services, or rights in the value chain.' },
];

export async function seedArchetypes(service: ArchetypesService, deps: ArchetypeDeps) {
  const archetypes: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < ARCHETYPES.length; i++) {
    const data = ARCHETYPES[i];
    const taxonomyIds = [deps.taxonomies.all[i % deps.taxonomies.all.length].id];

    const archetype = await service.create({
      name: data.name,
      purpose: data.purpose,
      description: data.description,
      taxonomyIds,
    });
    archetypes.push({ id: archetype.id, name: archetype.name });
  }

  return archetypes;
}
