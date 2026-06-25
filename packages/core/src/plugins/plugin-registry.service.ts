import { Inject, Injectable } from '@nestjs/common';
import { PLUGINS } from './plugin-tokens';
import { MarketlumApiPlugin } from './marketlum-api-plugin';

export interface PluginListEntry {
  id: string;
  name: string;
  version: string;
  marketlumCoreVersion: string;
  hasSettings: boolean;
}

@Injectable()
export class PluginRegistryService {
  constructor(@Inject(PLUGINS) private readonly plugins: MarketlumApiPlugin[]) {}

  list(): PluginListEntry[] {
    return this.plugins.map((p) => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      marketlumCoreVersion: p.manifest.marketlumCoreVersion,
      hasSettings: !!p.settings,
    }));
  }

  find(id: string): MarketlumApiPlugin | undefined {
    return this.plugins.find((p) => p.manifest.id === id);
  }
}
