import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AgentFinancialsQuery, agentFinancialsQuerySchema } from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AgentFinancialsService } from './agent-financials.service';

@ApiTags('invoices')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('agents/:agentId')
@UseGuards(AdminGuard)
export class AgentFinancialsController {
  constructor(private readonly financialsService: AgentFinancialsService) {}

  @Get('financials')
  @ApiOperation({
    summary:
      "Agent P&L for a calendar year: issued invoices as revenue, received as expense, in the agent's functional currency",
  })
  @ApiParam({ name: 'agentId', type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async financials(
    @Param('agentId') agentId: string,
    @Query(new ZodValidationPipe(agentFinancialsQuerySchema))
    query: AgentFinancialsQuery,
  ) {
    return this.financialsService.forAgent(agentId, query);
  }
}
