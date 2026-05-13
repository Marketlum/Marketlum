import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  UpdateBaseValueInput,
  updateBaseValueSchema,
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SystemSettingsService } from './system-settings.service';
import {
  UpdateBaseValueDto,
  SystemSettingsBaseValueResponseDto,
} from './system-setting.dto';

@ApiTags('system-settings')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(SystemSettingsBaseValueResponseDto)
@Controller('system-settings')
@UseGuards(AdminGuard)
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  @Get('base-value')
  @ApiOperation({ summary: 'Get the system base value setting' })
  @ApiOkResponse({ type: SystemSettingsBaseValueResponseDto })
  async getBaseValue() {
    return this.systemSettingsService.getBaseValue();
  }

  @Put('base-value')
  @ApiOperation({ summary: 'Set the system base value' })
  @ApiBody({ type: UpdateBaseValueDto })
  @ApiOkResponse({ type: SystemSettingsBaseValueResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async setBaseValue(
    @Body(new ZodValidationPipe(updateBaseValueSchema))
    body: UpdateBaseValueInput,
  ) {
    return this.systemSettingsService.setBaseValue(body.baseValueId);
  }
}
