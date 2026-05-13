import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  RecurringFlowQuery,
  recurringFlowQuerySchema,
  ValueStreamBudgetQuery,
  valueStreamBudgetQuerySchema,
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RecurringFlowsService } from './recurring-flows.service';
import { RecurringFlowsRollupService } from './rollup.service';
import { RecurringFlowsProjectionService } from './projection.service';
import { RecurringFlowsBudgetService } from './budget.service';
import {
  RecurringFlowResponseDto,
  RecurringFlowRollupDto,
  RecurringFlowProjectionDto,
  ValueStreamBudgetResponseDto,
} from './recurring-flow.dto';

@ApiTags('recurring-flows')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('value-streams/:valueStreamId')
@UseGuards(AdminGuard)
export class ValueStreamRecurringFlowsController {
  constructor(
    private readonly flowsService: RecurringFlowsService,
    private readonly rollupService: RecurringFlowsRollupService,
    private readonly projectionService: RecurringFlowsProjectionService,
    private readonly budgetService: RecurringFlowsBudgetService,
  ) {}

  @Get('recurring-flows')
  @ApiOperation({ summary: 'List recurring flows for a value stream' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiOkResponse({ type: RecurringFlowResponseDto, isArray: true })
  async list(
    @Param('valueStreamId') valueStreamId: string,
    @Query(new ZodValidationPipe(recurringFlowQuerySchema)) query: RecurringFlowQuery,
  ) {
    return this.flowsService.search({ ...query, valueStreamId });
  }

  @Get('recurring-flows/rollup')
  @ApiOperation({ summary: 'Get the recurring-flow rollup for a value stream' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiOkResponse({ type: RecurringFlowRollupDto })
  async rollup(@Param('valueStreamId') valueStreamId: string) {
    return this.rollupService.forValueStream(valueStreamId);
  }

  @Get('recurring-flows/projection')
  @ApiOperation({ summary: 'Get the recurring-flow projection for a value stream' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiQuery({ name: 'monthsAhead', required: false, type: Number })
  @ApiOkResponse({ type: RecurringFlowProjectionDto })
  async projection(
    @Param('valueStreamId') valueStreamId: string,
    @Query('monthsAhead') monthsAhead?: string,
  ) {
    const horizon = monthsAhead ? parseInt(monthsAhead, 10) : 12;
    return this.projectionService.forValueStream(valueStreamId, horizon);
  }

  @Get('budget')
  @ApiOperation({ summary: 'Get the value-stream budget for a calendar year' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'directOnly', required: false, type: Boolean })
  @ApiOkResponse({ type: ValueStreamBudgetResponseDto })
  async budget(
    @Param('valueStreamId') valueStreamId: string,
    @Query(new ZodValidationPipe(valueStreamBudgetQuerySchema)) query: ValueStreamBudgetQuery,
  ) {
    return this.budgetService.forValueStream(valueStreamId, query);
  }
}
