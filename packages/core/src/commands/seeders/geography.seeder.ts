import { GeographiesService } from '../../geographies/geographies.service';
import { GeographyType } from '@marketlum/shared';

const PLANET = { name: 'Earth', code: 'EARTH' };

const CONTINENTS = [
  { name: 'Europe', code: 'EU' },
  { name: 'North America', code: 'NA' },
  { name: 'Asia', code: 'AS' },
];

const COUNTRIES: Record<string, Array<{ name: string; code: string }>> = {
  'Europe': [
    { name: 'Germany', code: 'DE' },
    { name: 'France', code: 'FR' },
    { name: 'Poland', code: 'PL' },
  ],
  'North America': [
    { name: 'United States', code: 'US' },
    { name: 'Canada', code: 'CA' },
  ],
  'Asia': [
    { name: 'Japan', code: 'JP' },
    { name: 'Singapore', code: 'SG' },
  ],
};

export async function seedGeographies(service: GeographiesService) {
  const roots: Array<{ id: string; name: string }> = [];
  const countries: Array<{ id: string; name: string }> = [];

  const planet = await service.create({
    name: PLANET.name,
    code: PLANET.code,
    type: GeographyType.PLANET,
  });
  roots.push({ id: planet.id, name: planet.name });

  for (const continent of CONTINENTS) {
    const geo = await service.create({
      name: continent.name,
      code: continent.code,
      type: GeographyType.CONTINENT,
      parentId: planet.id,
    });
    roots.push({ id: geo.id, name: geo.name });

    for (const country of COUNTRIES[continent.name]) {
      const child = await service.create({
        name: country.name,
        code: country.code,
        type: GeographyType.COUNTRY,
        parentId: geo.id,
      });
      countries.push({ id: child.id, name: child.name });
    }
  }

  return { roots, countries, all: [...roots, ...countries] };
}
