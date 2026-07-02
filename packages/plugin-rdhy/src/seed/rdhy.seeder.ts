import { DataSource } from 'typeorm';
import { ValueStream } from '@marketlum/core';
import { RdhyPlatform } from '../platforms/rdhy-platform.entity';
import { RdhyPlatformValueStream } from '../platforms/rdhy-platform-value-stream.entity';

const PLATFORMS: Array<Pick<RdhyPlatform, 'code' | 'name' | 'description'>> = [
  {
    code: 'industrial_platform',
    name: 'Industrial Platform',
    description: 'Hosts product-facing value streams operating toward the market.',
  },
  {
    code: 'shared_services',
    name: 'Shared Services',
    description: 'Hosts internal value streams providing shared capabilities.',
  },
];

/** How many existing value streams get assigned across the sample platforms. */
const ASSIGNMENT_TARGET = 4;

/** Idempotent: platforms are upserted by code, already-assigned streams are skipped. */
export async function seedRdhy(dataSource: DataSource): Promise<void> {
  const platformRepository = dataSource.getRepository(RdhyPlatform);
  const linkRepository = dataSource.getRepository(RdhyPlatformValueStream);
  const valueStreamRepository = dataSource.getRepository(ValueStream);

  const platforms: RdhyPlatform[] = [];
  for (const definition of PLATFORMS) {
    let platform = await platformRepository.findOne({ where: { code: definition.code } });
    if (!platform) {
      platform = await platformRepository.save(platformRepository.create(definition));
    }
    platforms.push(platform);
  }

  const candidates = await valueStreamRepository.find({
    order: { code: 'ASC' },
    take: ASSIGNMENT_TARGET,
  });
  for (const [index, valueStream] of candidates.entries()) {
    const existing = await linkRepository.findOne({ where: { valueStreamId: valueStream.id } });
    if (existing) continue;
    await linkRepository.save(
      linkRepository.create({
        valueStreamId: valueStream.id,
        platformId: platforms[index % platforms.length].id,
      }),
    );
  }
}
