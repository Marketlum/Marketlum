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
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createOrderSchema,
  updateOrderSchema,
  paginationQuerySchema,
  CreateOrderInput,
  UpdateOrderInput,
  PaginationQuery,
  OrderTransitionAction,
} from '@marketlum/shared';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './order.dto';

@ApiTags('orders')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(OrderResponseDto)
@Controller('orders')
@UseGuards(AdminGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft order with a generated number' })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
  ) {
    return this.ordersService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'fromAgentId', required: false, type: String })
  @ApiQuery({ name: 'toAgentId', required: false, type: String })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'pipelineId', required: false, type: String })
  @ApiQuery({ name: 'currencyId', required: false, type: String })
  @ApiPaginatedResponse(OrderResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('state') state?: string,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
    @Query('agentId') agentId?: string,
    @Query('channelId') channelId?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('currencyId') currencyId?: string,
  ) {
    return this.ordersService.search({
      ...query,
      state,
      fromAgentId,
      toAgentId,
      agentId,
      channelId,
      pipelineId,
      currencyId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft order' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Order is not in draft state' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrderSchema)) body: UpdateOrderInput,
  ) {
    return this.ordersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft or cancelled order' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiNoContentResponse({ description: 'Order deleted' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Order is neither draft nor cancelled' })
  async remove(@Param('id') id: string) {
    await this.ordersService.remove(id);
  }

  @Post(':id/invoices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Generate an invoice from the order's header and items" })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiCreatedResponse({ description: 'The generated invoice, linked to the order' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Order is completed or cancelled' })
  async generateInvoice(@Param('id') id: string) {
    return this.ordersService.generateInvoice(id);
  }

  @Post(':id/place')
  @ApiOperation({ summary: 'Place a draft order' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Invalid transition' })
  @HttpCode(HttpStatus.OK)
  async place(@Param('id') id: string) {
    return this.ordersService.transition(id, OrderTransitionAction.PLACE);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start processing a new order' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Invalid transition' })
  @HttpCode(HttpStatus.OK)
  async start(@Param('id') id: string) {
    return this.ordersService.transition(id, OrderTransitionAction.START);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a processing order' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Invalid transition' })
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string) {
    return this.ordersService.transition(id, OrderTransitionAction.COMPLETE);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a non-final order' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Invalid transition' })
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string) {
    return this.ordersService.transition(id, OrderTransitionAction.CANCEL);
  }
}
