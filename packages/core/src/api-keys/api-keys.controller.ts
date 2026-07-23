import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createApiKeySchema, CreateApiKeyInput } from '@marketlum/shared';
import { CreateApiKeyDto, ApiKeySummaryDto, ApiKeyCreatedDto } from './api-key.dto';

// Session-only on purpose: a leaked API key must not be able to mint
// replacement keys or delete itself (spec 019, Q1.3).
@ApiTags('api-keys')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie (API keys not accepted here)' })
// AllowAuthenticated: keys are self-service credentials — a key acts as its
// owner, so a role-less user minting one gains nothing (spec 020 Q2.4).
@Controller('api-keys')
@UseGuards(SessionGuard)
@AllowAuthenticated()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an API key; the plaintext key is returned only in this response' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiCreatedResponse({ type: ApiKeyCreatedDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput,
  ) {
    return this.apiKeysService.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List my API keys (metadata only, never the key or hash)' })
  @ApiOkResponse({ type: ApiKeySummaryDto, isArray: true })
  async findAll(@CurrentUser() user: User) {
    return this.apiKeysService.findAllForUser(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of my API keys; requests using it fail immediately' })
  @ApiParam({ name: 'id', type: String, description: 'API key UUID' })
  @ApiNoContentResponse({ description: 'API key deleted' })
  @ApiNotFoundResponse({ description: 'API key not found (including keys owned by other users)' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.apiKeysService.remove(user.id, id);
  }
}
