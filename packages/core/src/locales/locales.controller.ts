import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { LocalesService } from './locales.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createLocaleSchema,
  paginationQuerySchema,
  type CreateLocaleInput,
  type PaginationQuery,
} from '@marketlum/shared';
import { CreateLocaleDto, LocaleResponseDto } from './locale.dto';

@ApiTags('locales')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(LocaleResponseDto)
@Controller('locales')
@UseGuards(AdminGuard)
export class LocalesController {
  constructor(private readonly localesService: LocalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Activate a supported locale' })
  @ApiBody({ type: CreateLocaleDto })
  @ApiCreatedResponse({ type: LocaleResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createLocaleSchema))
    body: CreateLocaleInput,
  ) {
    return this.localesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List active locales' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiPaginatedResponse(LocaleResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ) {
    return this.localesService.findAll(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a locale' })
  @ApiParam({ name: 'id', type: String, description: 'Locale UUID' })
  @ApiNoContentResponse({ description: 'Locale deactivated' })
  @ApiNotFoundResponse({ description: 'Locale not found' })
  async remove(@Param('id') id: string) {
    await this.localesService.remove(id);
  }
}
