import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  CreateExchangeRateInput,
  UpdateExchangeRateInput,
  ExchangeRateQuery,
  ExchangeRateLookupQuery,
  createExchangeRateSchema,
  updateExchangeRateSchema,
  exchangeRateQuerySchema,
  exchangeRateLookupQuerySchema,
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ExchangeRatesService } from './exchange-rates.service';
import {
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateResponseDto,
  ExchangeRateLookupResponseDto,
} from './exchange-rate.dto';

@ApiTags('exchange-rates')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ExchangeRateResponseDto, ExchangeRateLookupResponseDto)
@Controller('exchange-rates')
@UseGuards(AdminGuard)
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an exchange rate' })
  @ApiBody({ type: CreateExchangeRateDto })
  @ApiCreatedResponse({ type: ExchangeRateResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createExchangeRateSchema))
    body: CreateExchangeRateInput,
  ) {
    return this.exchangeRatesService.create(body);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Look up the active rate for a value pair' })
  @ApiQuery({ name: 'fromValueId', type: String })
  @ApiQuery({ name: 'toValueId', type: String })
  @ApiQuery({ name: 'at', required: false, type: String })
  @ApiOkResponse({ type: ExchangeRateLookupResponseDto, description: 'Resolved rate or null' })
  async lookup(
    @Query(new ZodValidationPipe(exchangeRateLookupQuerySchema))
    query: ExchangeRateLookupQuery,
  ) {
    const at = query.at ? new Date(query.at) : new Date();
    const result = await this.exchangeRatesService.lookup(
      query.fromValueId,
      query.toValueId,
      at,
    );
    if (!result) return null;
    return {
      rate: result.rate,
      sourceRowId: result.sourceRowId,
      effectiveAt: result.effectiveAt.toISOString(),
      fromValueId: result.fromValueId,
      toValueId: result.toValueId,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List exchange rates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'fromValueId', required: false, type: String })
  @ApiQuery({ name: 'toValueId', required: false, type: String })
  @ApiQuery({ name: 'at', required: false, type: String })
  async list(
    @Query(new ZodValidationPipe(exchangeRateQuerySchema))
    query: ExchangeRateQuery,
  ) {
    return this.exchangeRatesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exchange rate by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ExchangeRateResponseDto })
  @ApiNotFoundResponse({ description: 'Exchange rate not found' })
  async findOne(@Param('id') id: string) {
    return this.exchangeRatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateExchangeRateDto })
  @ApiOkResponse({ type: ExchangeRateResponseDto })
  @ApiNotFoundResponse({ description: 'Exchange rate not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExchangeRateSchema))
    body: UpdateExchangeRateInput,
  ) {
    return this.exchangeRatesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exchange rate' })
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse({ description: 'Exchange rate deleted' })
  @ApiNotFoundResponse({ description: 'Exchange rate not found' })
  async remove(@Param('id') id: string) {
    await this.exchangeRatesService.remove(id);
  }
}
