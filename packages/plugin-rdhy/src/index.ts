import type { MarketlumApiPlugin } from '@marketlum/core';
import { RdhyModule } from './rdhy.module';
import { RdhyPlatform } from './platforms/rdhy-platform.entity';
import { RdhyPlatformValueStream } from './platforms/rdhy-platform-value-stream.entity';
import { CreateRdhyPlatformTables1700000000100 } from './migrations/1700000000100-CreateRdhyPlatformTables';
import { seedRdhy } from './seed/rdhy.seeder';
import { RDHY_PLUGIN_ID } from './shared/schemas';

/** The RenDanHeYi plugin: groups core value streams into plugin-owned
 * platforms (spec 013). Owns the plugin_rdhy_* tables; never touches core. */
export const rdhyPlugin: MarketlumApiPlugin = {
  manifest: {
    id: RDHY_PLUGIN_ID,
    name: 'RenDanHeYi',
    version: '0.1.0',
    marketlumCoreVersion: '^0.4.0',
  },
  module: RdhyModule,
  entities: [RdhyPlatform, RdhyPlatformValueStream],
  migrations: [CreateRdhyPlatformTables1700000000100],
  primaryEntities: [RdhyPlatform],
  seed: seedRdhy,
};

export { RdhyModule } from './rdhy.module';
export { RdhyPlatform } from './platforms/rdhy-platform.entity';
export { RdhyPlatformValueStream } from './platforms/rdhy-platform-value-stream.entity';
export { PlatformsService } from './platforms/platforms.service';
export { seedRdhy } from './seed/rdhy.seeder';
export * from './shared/schemas';
