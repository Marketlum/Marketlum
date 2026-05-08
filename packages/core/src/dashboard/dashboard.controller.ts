import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { dashboardQuerySchema, type DashboardQuery } from '@marketlum/shared';

@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('dashboard')
@UseGuards(AdminGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Aggregate dashboard summary',
    description: 'Returns revenue/expense totals and time-series data for the configured window.',
  })
  @ApiQuery({ name: 'agentId', required: false, type: String, description: 'Optional agent UUID to scope totals' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date — start of window' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date — end of window' })
  @ApiOkResponse({
    description: 'Summary totals plus time-series data',
    schema: {
      type: 'object',
      properties: {
        totalRevenue: { type: 'number' },
        totalExpense: { type: 'number' },
        timeSeries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              revenue: { type: 'number' },
              expense: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getSummary(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery,
  ) {
    return this.dashboardService.getSummary(query);
  }
}
