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
import {
  ValueStreamFinancialsQuery,
  valueStreamFinancialsQuerySchema,
} from '@marketlum/shared';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ValueStreamFinancialsService } from './value-stream-financials.service';
import { ValueStreamFinancialsResponseDto } from './invoice.dto';

@ApiTags('invoices')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('value-streams/:valueStreamId')
@UseGuards(AdminGuard)
export class ValueStreamFinancialsController {
  constructor(
    private readonly financialsService: ValueStreamFinancialsService,
  ) {}

  @Get('financials')
  @ApiOperation({
    summary:
      'Get value-stream actuals (revenue/expense from invoices) for a calendar year',
  })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'directOnly', required: false, type: Boolean })
  @ApiOkResponse({ type: ValueStreamFinancialsResponseDto })
  async financials(
    @Param('valueStreamId') valueStreamId: string,
    @Query(new ZodValidationPipe(valueStreamFinancialsQuerySchema))
    query: ValueStreamFinancialsQuery,
  ) {
    return this.financialsService.forValueStream(valueStreamId, query);
  }
}
