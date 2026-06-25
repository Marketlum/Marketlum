import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { registerPluginPrimaryEntities } from '../events/plugin-primary-entities';
import { PLUGINS } from './plugin-tokens';
import { MarketlumApiPlugin } from './marketlum-api-plugin';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginSettingsService } from './plugin-settings.service';
import { PluginsController } from './plugins.controller';

@Module({})
export class PluginsModule {
  static forRoot(plugins: MarketlumApiPlugin[]): DynamicModule {
    for (const plugin of plugins) {
      if (plugin.primaryEntities?.length) {
        registerPluginPrimaryEntities(plugin.manifest.id, plugin.primaryEntities);
      }
    }

    return {
      module: PluginsModule,
      global: true,
      imports: [TypeOrmModule.forFeature([SystemSetting])],
      controllers: [PluginsController],
      providers: [
        { provide: PLUGINS, useValue: plugins },
        PluginRegistryService,
        PluginSettingsService,
      ],
      exports: [PLUGINS, PluginRegistryService, PluginSettingsService],
    };
  }
}
