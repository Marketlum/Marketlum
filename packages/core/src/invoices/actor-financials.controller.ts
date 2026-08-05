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
import { ActorFinancialsQuery, actorFinancialsQuerySchema } from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ActorFinancialsService } from './actor-financials.service';

@ApiTags('invoices')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('actors/:actorId')
@UseGuards(AdminGuard)
export class ActorFinancialsController {
  constructor(private readonly financialsService: ActorFinancialsService) {}

  @Get('financials')
  @ApiOperation({
    summary:
      "Actor P&L for a calendar year: issued invoices as revenue, received as expense, in the actor's functional currency",
  })
  @ApiParam({ name: 'actorId', type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({
    name: 'consolidated',
    required: false,
    type: Boolean,
    description:
      'Include the whole subtree, eliminating internal invoices between subtree members',
  })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async financials(
    @Param('actorId') actorId: string,
    @Query(new ZodValidationPipe(actorFinancialsQuerySchema))
    query: ActorFinancialsQuery,
  ) {
    return this.financialsService.forActor(actorId, query);
  }
}
