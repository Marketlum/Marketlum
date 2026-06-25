import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';
import { pluginSettingsKey } from '@marketlum/shared';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { PLUGINS } from './plugin-tokens';
import { MarketlumApiPlugin } from './marketlum-api-plugin';

const CONFIG_KEY = 'config';

/**
 * Reads and writes a plugin's settings as a single JSON blob under the
 * namespaced key `plugin.<id>.config`, applying defaults on read and validating
 * against the plugin's Zod schema on write.
 */
@Injectable()
export class PluginSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
    @Inject(PLUGINS) private readonly plugins: MarketlumApiPlugin[],
  ) {}

  async get<T = unknown>(pluginId: string): Promise<T> {
    const plugin = this.requirePluginWithSettings(pluginId);
    const row = await this.settingsRepository.findOne({
      where: { key: pluginSettingsKey(pluginId, CONFIG_KEY) },
    });
    const raw = row ? JSON.parse(row.value) : plugin.settings!.defaults;
    return plugin.settings!.schema.parse(raw) as T;
  }

  async set<T = unknown>(pluginId: string, value: unknown): Promise<T> {
    const plugin = this.requirePluginWithSettings(pluginId);
    let validated: T;
    try {
      validated = plugin.settings!.schema.parse(value) as T;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw error;
    }
    await this.settingsRepository.upsert(
      {
        key: pluginSettingsKey(pluginId, CONFIG_KEY),
        value: JSON.stringify(validated),
      },
      ['key'],
    );
    return validated;
  }

  private requirePluginWithSettings(pluginId: string): MarketlumApiPlugin {
    const plugin = this.plugins.find((p) => p.manifest.id === pluginId);
    if (!plugin) throw new NotFoundException(`Plugin "${pluginId}" is not registered`);
    if (!plugin.settings) throw new NotFoundException(`Plugin "${pluginId}" has no settings`);
    return plugin;
  }
}
