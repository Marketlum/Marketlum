import { Controller, Get } from '@nestjs/common';
import { DashboardService, DashboardStats } from './dashboard.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Returns aggregated statistics for the dashboard' })
  async getStats(): Promise<DashboardStats> {
    return this.dashboardService.getStats();
  }
}
