import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginSettingsService } from './plugin-settings.service';

@ApiTags('plugins')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('plugins')
@UseGuards(AdminGuard)
export class PluginsController {
  constructor(
    private readonly registry: PluginRegistryService,
    private readonly settings: PluginSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the active plugins' })
  list() {
    return this.registry.list();
  }

  @Get(':id/settings')
  @ApiOperation({ summary: "Get a plugin's settings (defaults applied)" })
  async getSettings(@Param('id') id: string) {
    return { value: await this.settings.get(id) };
  }

  @Put(':id/settings')
  @ApiOperation({ summary: "Validate and persist a plugin's settings" })
  async setSettings(@Param('id') id: string, @Body() body: unknown) {
    return { value: await this.settings.set(id, body) };
  }
}
