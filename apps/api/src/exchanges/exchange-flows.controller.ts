import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExchangeFlowsService } from './exchange-flows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createExchangeFlowSchema,
  updateExchangeFlowSchema,
  UpdateExchangeFlowInput,
} from '@marketlum/shared';

@Controller('exchanges/:exchangeId/flows')
@UseGuards(JwtAuthGuard)
export class ExchangeFlowsController {
  constructor(private readonly flowsService: ExchangeFlowsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('exchangeId') exchangeId: string,
    @Body(new ZodValidationPipe(createExchangeFlowSchema)) body: any,
  ) {
    return this.flowsService.create(exchangeId, body);
  }

  @Get()
  async findAll(@Param('exchangeId') exchangeId: string) {
    return this.flowsService.findAll(exchangeId);
  }

  @Get(':flowId')
  async findOne(
    @Param('exchangeId') exchangeId: string,
    @Param('flowId') flowId: string,
  ) {
    return this.flowsService.findOne(exchangeId, flowId);
  }

  @Patch(':flowId')
  async update(
    @Param('exchangeId') exchangeId: string,
    @Param('flowId') flowId: string,
    @Body(new ZodValidationPipe(updateExchangeFlowSchema)) body: UpdateExchangeFlowInput,
  ) {
    return this.flowsService.update(exchangeId, flowId, body);
  }

  @Delete(':flowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('exchangeId') exchangeId: string,
    @Param('flowId') flowId: string,
  ) {
    await this.flowsService.remove(exchangeId, flowId);
  }
}
