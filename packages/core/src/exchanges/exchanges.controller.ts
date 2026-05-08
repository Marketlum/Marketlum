import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
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
  ApiProduces,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExchangesService } from './exchanges.service';
import { ExchangePdfService } from './pdf/exchange-pdf.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createExchangeSchema,
  updateExchangeSchema,
  transitionExchangeSchema,
  paginationQuerySchema,
  CreateExchangeInput,
  UpdateExchangeInput,
  TransitionExchangeInput,
  PaginationQuery,
  ExchangeState,
} from '@marketlum/shared';
import {
  CreateExchangeDto,
  UpdateExchangeDto,
  TransitionExchangeDto,
  ExchangeResponseDto,
} from './exchange.dto';

@ApiTags('exchanges')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ExchangeResponseDto)
@Controller('exchanges')
@UseGuards(AdminGuard)
export class ExchangesController {
  constructor(
    private readonly exchangesService: ExchangesService,
    private readonly exchangePdfService: ExchangePdfService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an exchange' })
  @ApiBody({ type: CreateExchangeDto })
  @ApiCreatedResponse({ type: ExchangeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createExchangeSchema)) body: CreateExchangeInput,
  ) {
    return this.exchangesService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate exchanges' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'state', required: false, enum: ExchangeState })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiQuery({ name: 'pipelineId', required: false, type: String })
  @ApiQuery({ name: 'partyAgentId', required: false, type: String })
  @ApiQuery({ name: 'leadUserId', required: false, type: String })
  @ApiPaginatedResponse(ExchangeResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('state') state?: string,
    @Query('channelId') channelId?: string,
    @Query('valueStreamId') valueStreamId?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('partyAgentId') partyAgentId?: string,
    @Query('leadUserId') leadUserId?: string,
  ) {
    return this.exchangesService.search({
      ...query,
      state,
      channelId,
      valueStreamId,
      pipelineId,
      partyAgentId,
      leadUserId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exchange by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Exchange UUID' })
  @ApiOkResponse({ type: ExchangeResponseDto })
  @ApiNotFoundResponse({ description: 'Exchange not found' })
  async findOne(@Param('id') id: string) {
    return this.exchangesService.findOne(id);
  }

  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Download an offer-style PDF of the exchange',
    description: 'Returns a single-file PDF including tension details, parties, flows, and a value reference table.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Exchange UUID' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDF binary; Content-Disposition: attachment',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Exchange not found' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.exchangePdfService.generate(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }

  @Post(':id/transitions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transition an exchange between open / closed / completed',
    description: 'Allowed actions: close, complete, reopen. Completed is a final state.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Exchange UUID' })
  @ApiBody({ type: TransitionExchangeDto })
  @ApiOkResponse({ type: ExchangeResponseDto })
  @ApiBadRequestResponse({ description: 'Transition not allowed from the current state' })
  @ApiNotFoundResponse({ description: 'Exchange not found' })
  async transition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionExchangeSchema)) body: TransitionExchangeInput,
  ) {
    return this.exchangesService.transition(id, body.action);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exchange' })
  @ApiParam({ name: 'id', type: String, description: 'Exchange UUID' })
  @ApiBody({ type: UpdateExchangeDto })
  @ApiOkResponse({ type: ExchangeResponseDto })
  @ApiNotFoundResponse({ description: 'Exchange not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExchangeSchema)) body: UpdateExchangeInput,
  ) {
    return this.exchangesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exchange' })
  @ApiParam({ name: 'id', type: String, description: 'Exchange UUID' })
  @ApiNoContentResponse({ description: 'Exchange deleted' })
  @ApiNotFoundResponse({ description: 'Exchange not found' })
  async remove(@Param('id') id: string) {
    await this.exchangesService.remove(id);
  }
}
