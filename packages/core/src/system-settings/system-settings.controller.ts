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
  UpdatePresentationCurrencyInput,
  updatePresentationCurrencySchema,
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SystemSettingsService } from './system-settings.service';
import {
  UpdatePresentationCurrencyDto,
  SystemSettingsPresentationCurrencyResponseDto,
} from './system-setting.dto';

@ApiTags('system-settings')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(SystemSettingsPresentationCurrencyResponseDto)
@Controller('system-settings')
@UseGuards(AdminGuard)
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  @Get('presentation-currency')
  @ApiOperation({ summary: 'Get the system presentation currency setting' })
  @ApiOkResponse({ type: SystemSettingsPresentationCurrencyResponseDto })
  async getPresentationCurrency() {
    return this.systemSettingsService.getPresentationCurrency();
  }

  @Put('presentation-currency')
  @ApiOperation({ summary: 'Set the system presentation currency' })
  @ApiBody({ type: UpdatePresentationCurrencyDto })
  @ApiOkResponse({ type: SystemSettingsPresentationCurrencyResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async setPresentationCurrency(
    @Body(new ZodValidationPipe(updatePresentationCurrencySchema))
    body: UpdatePresentationCurrencyInput,
  ) {
    return this.systemSettingsService.setPresentationCurrency(body.presentationCurrencyId);
  }
}
