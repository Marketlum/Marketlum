import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  paginationQuerySchema,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createInvoiceSchema)) body: CreateInvoiceInput,
  ) {
    return this.invoicesService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
    @Query('paid') paid?: string,
    @Query('currencyId') currencyId?: string,
    @Query('channelId') channelId?: string,
  ) {
    return this.invoicesService.search({
      ...query,
      fromAgentId,
      toAgentId,
      paid,
      currencyId,
      channelId,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInvoiceSchema)) body: UpdateInvoiceInput,
  ) {
    return this.invoicesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.invoicesService.remove(id);
  }
}
