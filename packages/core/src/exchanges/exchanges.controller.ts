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
import { Response } from 'express';
import { ExchangesService } from './exchanges.service';
import { ExchangePdfService } from './pdf/exchange-pdf.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createExchangeSchema,
  updateExchangeSchema,
  transitionExchangeSchema,
  paginationQuerySchema,
  CreateExchangeInput,
  UpdateExchangeInput,
  TransitionExchangeInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('exchanges')
@UseGuards(AdminGuard)
export class ExchangesController {
  constructor(
    private readonly exchangesService: ExchangesService,
    private readonly exchangePdfService: ExchangePdfService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createExchangeSchema)) body: CreateExchangeInput,
  ) {
    return this.exchangesService.create(body);
  }

  @Get('search')
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
  async findOne(@Param('id') id: string) {
    return this.exchangesService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.exchangePdfService.generate(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }

  @Post(':id/transitions')
  @HttpCode(HttpStatus.OK)
  async transition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionExchangeSchema)) body: TransitionExchangeInput,
  ) {
    return this.exchangesService.transition(id, body.action);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExchangeSchema)) body: UpdateExchangeInput,
  ) {
    return this.exchangesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.exchangesService.remove(id);
  }
}
