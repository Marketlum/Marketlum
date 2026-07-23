import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginSettingsService } from './plugin-settings.service';

@ApiTags('plugins')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
// RequirePermission('plugins'): without it, `/plugins/:id/settings` would be
// inferred as a plugin feature route (`<id>.settings`) instead of management.
@Controller('plugins')
@UseGuards(AdminGuard)
@RequirePermission('plugins')
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
