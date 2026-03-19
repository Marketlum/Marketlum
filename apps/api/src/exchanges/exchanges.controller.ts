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
import { ExchangesService } from './exchanges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

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
    @Query('partyAgentId') partyAgentId?: string,
    @Query('leadUserId') leadUserId?: string,
  ) {
    return this.exchangesService.search({
      ...query,
      state,
      channelId,
      valueStreamId,
      partyAgentId,
      leadUserId,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.exchangesService.findOne(id);
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
