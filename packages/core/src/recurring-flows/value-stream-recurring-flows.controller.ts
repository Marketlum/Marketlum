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
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RecurringFlowsService } from './recurring-flows.service';
import { RecurringFlowsRollupService } from './rollup.service';
import { RecurringFlowsProjectionService } from './projection.service';
import {
  RecurringFlowResponseDto,
  RecurringFlowRollupDto,
  RecurringFlowProjectionDto,
} from './recurring-flow.dto';

@ApiTags('recurring-flows')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('value-streams/:valueStreamId/recurring-flows')
@UseGuards(AdminGuard)
export class ValueStreamRecurringFlowsController {
  constructor(
    private readonly flowsService: RecurringFlowsService,
    private readonly rollupService: RecurringFlowsRollupService,
    private readonly projectionService: RecurringFlowsProjectionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List recurring flows for a value stream' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiOkResponse({ type: RecurringFlowResponseDto, isArray: true })
  async list(
    @Param('valueStreamId') valueStreamId: string,
    @Query(new ZodValidationPipe(recurringFlowQuerySchema)) query: RecurringFlowQuery,
  ) {
    return this.flowsService.search({ ...query, valueStreamId });
  }

  @Get('rollup')
  @ApiOperation({ summary: 'Get the recurring-flow rollup for a value stream' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiOkResponse({ type: RecurringFlowRollupDto })
  async rollup(@Param('valueStreamId') valueStreamId: string) {
    return this.rollupService.forValueStream(valueStreamId);
  }

  @Get('projection')
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
}
