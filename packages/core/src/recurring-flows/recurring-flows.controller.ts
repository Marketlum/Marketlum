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
  Res,
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
import { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  CreateRecurringFlowInput,
  UpdateRecurringFlowInput,
  TransitionRecurringFlowInput,
  RecurringFlowQuery,
  RecurringFlowDirection,
  RecurringFlowFrequency,
  RecurringFlowStatus,
  RecurringFlowTransitionAction,
  createRecurringFlowSchema,
  updateRecurringFlowSchema,
  transitionRecurringFlowSchema,
  recurringFlowQuerySchema,
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RecurringFlowsService } from './recurring-flows.service';
import {
  CreateRecurringFlowDto,
  UpdateRecurringFlowDto,
  TransitionRecurringFlowDto,
  RecurringFlowResponseDto,
} from './recurring-flow.dto';

@ApiTags('recurring-flows')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(RecurringFlowResponseDto)
@Controller('recurring-flows')
@UseGuards(AdminGuard)
export class RecurringFlowsController {
  constructor(private readonly recurringFlowsService: RecurringFlowsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a recurring flow' })
  @ApiBody({ type: CreateRecurringFlowDto })
  @ApiCreatedResponse({ type: RecurringFlowResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createRecurringFlowSchema)) body: CreateRecurringFlowInput,
  ) {
    return this.recurringFlowsService.create(body);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export recurring flows as CSV' })
  async exportCsv(
    @Query(new ZodValidationPipe(recurringFlowQuerySchema)) query: RecurringFlowQuery,
    @Res() res: Response,
  ) {
    const result = await this.recurringFlowsService.search({ ...query, page: 1, limit: 10000 });
    const header = [
      'id',
      'valueStream',
      'counterpartyAgent',
      'value',
      'currency',
      'direction',
      'amount',
      'frequency',
      'interval',
      'startDate',
      'endDate',
      'status',
      'description',
    ].join(',');
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = result.data.map((flow) =>
      [
        flow.id,
        flow.valueStream?.name,
        flow.counterpartyAgent?.name,
        flow.value?.name ?? '',
        flow.currency?.name ?? '',
        flow.direction,
        flow.amount,
        flow.frequency,
        flow.interval,
        flow.startDate,
        flow.endDate ?? '',
        flow.status,
        flow.description ?? '',
      ]
        .map(escape)
        .join(','),
    );
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="recurring-flows.csv"');
    res.send(csv);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate recurring flows' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiQuery({ name: 'counterpartyAgentId', required: false, type: String })
  @ApiQuery({ name: 'direction', required: false, enum: RecurringFlowDirection })
  @ApiQuery({ name: 'status', required: false, enum: RecurringFlowStatus, isArray: true })
  @ApiQuery({ name: 'frequency', required: false, enum: RecurringFlowFrequency, isArray: true })
  @ApiQuery({ name: 'unit', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'taxonomyId', required: false, type: String, isArray: true })
  async list(
    @Query(new ZodValidationPipe(recurringFlowQuerySchema)) query: RecurringFlowQuery,
  ) {
    return this.recurringFlowsService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring flow by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RecurringFlowResponseDto })
  @ApiNotFoundResponse({ description: 'Recurring flow not found' })
  async findOne(@Param('id') id: string) {
    return this.recurringFlowsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateRecurringFlowDto })
  @ApiOkResponse({ type: RecurringFlowResponseDto })
  @ApiNotFoundResponse({ description: 'Recurring flow not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecurringFlowSchema)) body: UpdateRecurringFlowInput,
  ) {
    return this.recurringFlowsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recurring flow (only allowed in draft status)' })
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse({ description: 'Recurring flow deleted' })
  @ApiNotFoundResponse({ description: 'Recurring flow not found' })
  async remove(@Param('id') id: string) {
    await this.recurringFlowsService.remove(id);
  }

  @Post(':id/transitions')
  @ApiOperation({ summary: 'Apply a lifecycle transition to a recurring flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: TransitionRecurringFlowDto })
  @ApiOkResponse({ type: RecurringFlowResponseDto })
  @ApiBadRequestResponse({ description: 'Illegal transition' })
  async transition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionRecurringFlowSchema)) body: TransitionRecurringFlowInput,
  ) {
    return this.recurringFlowsService.transition(
      id,
      body.action as RecurringFlowTransitionAction,
      body.endDate,
    );
  }
}
