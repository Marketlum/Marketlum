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
import { TransactionsService } from './transactions.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTransactionSchema,
  updateTransactionSchema,
  paginationQuerySchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('transactions')
@UseGuards(AdminGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createTransactionSchema)) body: CreateTransactionInput,
  ) {
    return this.transactionsService.create(body);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('fromAccountId') fromAccountId?: string,
    @Query('toAccountId') toAccountId?: string,
  ) {
    return this.transactionsService.findAll({ ...query, fromAccountId, toAccountId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema)) body: UpdateTransactionInput,
  ) {
    return this.transactionsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.transactionsService.remove(id);
  }
}
