import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiTags('Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  // ============= ACCOUNTS =============

  @Post('accounts')
  @ApiOperation({ summary: 'Create a new account' })
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.ledgerService.createAccount(createAccountDto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List all accounts with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by name or description' })
  @ApiQuery({ name: 'ownerAgentId', required: false, type: String })
  @ApiQuery({ name: 'valueId', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'e.g., name_asc, balance_desc, updatedAt_desc' })
  findAllAccounts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('ownerAgentId') ownerAgentId?: string,
    @Query('valueId') valueId?: string,
    @Query('sort') sort?: string,
  ) {
    return this.ledgerService.findAllAccounts(
      { q, ownerAgentId, valueId, sort },
      { page, limit },
    );
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get a single account by ID' })
  @ApiParam({ name: 'id', type: String })
  findOneAccount(@Param('id') id: string) {
    return this.ledgerService.findOneAccount(id);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Update an account' })
  @ApiParam({ name: 'id', type: String })
  updateAccount(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.ledgerService.updateAccount(id, updateAccountDto);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Delete an account (only if no transactions exist)' })
  @ApiParam({ name: 'id', type: String })
  removeAccount(@Param('id') id: string) {
    return this.ledgerService.removeAccount(id);
  }

  // ============= TRANSACTIONS =============

  @Post('transactions')
  @ApiOperation({ summary: 'Create a new transaction' })
  createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return this.ledgerService.createTransaction(createTransactionDto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List all transactions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'accountId', required: false, type: String, description: 'Show transactions where this account is from or to' })
  @ApiQuery({ name: 'fromAccountId', required: false, type: String })
  @ApiQuery({ name: 'toAccountId', required: false, type: String })
  @ApiQuery({ name: 'verified', required: false, type: Boolean })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'minAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search in note' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'e.g., timestamp_desc, amount_asc' })
  findAllTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('accountId') accountId?: string,
    @Query('fromAccountId') fromAccountId?: string,
    @Query('toAccountId') toAccountId?: string,
    @Query('verified') verified?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    return this.ledgerService.findAllTransactions(
      {
        accountId,
        fromAccountId,
        toAccountId,
        verified: verified === undefined ? undefined : verified === 'true',
        dateFrom,
        dateTo,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        q,
        sort,
      },
      { page, limit },
    );
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  @ApiParam({ name: 'id', type: String })
  findOneTransaction(@Param('id') id: string) {
    return this.ledgerService.findOneTransaction(id);
  }

  @Patch('transactions/:id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({ name: 'id', type: String })
  updateTransaction(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    return this.ledgerService.updateTransaction(id, updateTransactionDto);
  }

  @Post('transactions/:id/verify')
  @ApiOperation({ summary: 'Verify or unverify a transaction' })
  @ApiParam({ name: 'id', type: String })
  verifyTransaction(@Param('id') id: string, @Body('verified') verified: boolean) {
    return this.ledgerService.verifyTransaction(id, verified);
  }

  @Delete('transactions/:id')
  @ApiOperation({ summary: 'Delete a transaction and reverse its balance effect' })
  @ApiParam({ name: 'id', type: String })
  removeTransaction(@Param('id') id: string) {
    return this.ledgerService.removeTransaction(id);
  }

  // ============= ADMIN =============

  @Post('recalculate-balances')
  @ApiOperation({ summary: 'Recalculate all account balances from transactions' })
  recalculateBalances() {
    return this.ledgerService.recalculateBalances();
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample ledger data' })
  seed() {
    return this.ledgerService.seed();
  }
}
