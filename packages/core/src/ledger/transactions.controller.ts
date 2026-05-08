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
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createTransactionSchema,
  updateTransactionSchema,
  paginationQuerySchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionResponseDto,
} from './transaction.dto';

@ApiTags('transactions')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(TransactionResponseDto)
@Controller('transactions')
@UseGuards(AdminGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createTransactionSchema)) body: CreateTransactionInput,
  ) {
    return this.transactionsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'fromAccountId', required: false, type: String })
  @ApiQuery({ name: 'toAccountId', required: false, type: String })
  @ApiPaginatedResponse(TransactionResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('fromAccountId') fromAccountId?: string,
    @Query('toAccountId') toAccountId?: string,
  ) {
    return this.transactionsService.findAll({ ...query, fromAccountId, toAccountId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Transaction UUID' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({ name: 'id', type: String, description: 'Transaction UUID' })
  @ApiBody({ type: UpdateTransactionDto })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema)) body: UpdateTransactionInput,
  ) {
    return this.transactionsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiParam({ name: 'id', type: String, description: 'Transaction UUID' })
  @ApiNoContentResponse({ description: 'Transaction deleted' })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async remove(@Param('id') id: string) {
    await this.transactionsService.remove(id);
  }
}
