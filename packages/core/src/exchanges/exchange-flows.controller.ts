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
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ExchangeFlowsService } from './exchange-flows.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createExchangeFlowSchema,
  updateExchangeFlowSchema,
  UpdateExchangeFlowInput,
} from '@marketlum/shared';
import {
  CreateExchangeFlowDto,
  UpdateExchangeFlowDto,
  ExchangeFlowResponseDto,
} from './exchange.dto';

@ApiTags('exchange-flows')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('exchanges/:exchangeId/flows')
@UseGuards(AdminGuard)
export class ExchangeFlowsController {
  constructor(private readonly flowsService: ExchangeFlowsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a flow on an exchange' })
  @ApiParam({ name: 'exchangeId', type: String, description: 'Exchange UUID' })
  @ApiBody({ type: CreateExchangeFlowDto })
  @ApiCreatedResponse({ type: ExchangeFlowResponseDto })
  @ApiBadRequestResponse({ description: 'fromAgent or toAgent is not a party of this exchange' })
  @ApiNotFoundResponse({ description: 'Exchange or referenced entity not found' })
  async create(
    @Param('exchangeId') exchangeId: string,
    @Body(new ZodValidationPipe(createExchangeFlowSchema)) body: any,
  ) {
    return this.flowsService.create(exchangeId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all flows on an exchange' })
  @ApiParam({ name: 'exchangeId', type: String, description: 'Exchange UUID' })
  @ApiOkResponse({ type: ExchangeFlowResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Exchange not found' })
  async findAll(@Param('exchangeId') exchangeId: string) {
    return this.flowsService.findAll(exchangeId);
  }

  @Get(':flowId')
  @ApiOperation({ summary: 'Get a single flow on an exchange' })
  @ApiParam({ name: 'exchangeId', type: String, description: 'Exchange UUID' })
  @ApiParam({ name: 'flowId', type: String, description: 'Flow UUID' })
  @ApiOkResponse({ type: ExchangeFlowResponseDto })
  @ApiNotFoundResponse({ description: 'Exchange or flow not found' })
  async findOne(
    @Param('exchangeId') exchangeId: string,
    @Param('flowId') flowId: string,
  ) {
    return this.flowsService.findOne(exchangeId, flowId);
  }

  @Patch(':flowId')
  @ApiOperation({ summary: 'Update a flow on an exchange' })
  @ApiParam({ name: 'exchangeId', type: String, description: 'Exchange UUID' })
  @ApiParam({ name: 'flowId', type: String, description: 'Flow UUID' })
  @ApiBody({ type: UpdateExchangeFlowDto })
  @ApiOkResponse({ type: ExchangeFlowResponseDto })
  @ApiBadRequestResponse({ description: 'fromAgent or toAgent is not a party of this exchange' })
  @ApiNotFoundResponse({ description: 'Exchange or flow not found' })
  async update(
    @Param('exchangeId') exchangeId: string,
    @Param('flowId') flowId: string,
    @Body(new ZodValidationPipe(updateExchangeFlowSchema)) body: UpdateExchangeFlowInput,
  ) {
    return this.flowsService.update(exchangeId, flowId, body);
  }

  @Delete(':flowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a flow on an exchange' })
  @ApiParam({ name: 'exchangeId', type: String, description: 'Exchange UUID' })
  @ApiParam({ name: 'flowId', type: String, description: 'Flow UUID' })
  @ApiNoContentResponse({ description: 'Flow deleted' })
  @ApiNotFoundResponse({ description: 'Exchange or flow not found' })
  async remove(
    @Param('exchangeId') exchangeId: string,
    @Param('flowId') flowId: string,
  ) {
    await this.flowsService.remove(exchangeId, flowId);
  }
}
