import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Account } from './entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Agent, AgentType } from '../agents/entities/agent.entity';
import { Value, ValueType } from '../value/entities/value.entity';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

interface AccountFilters {
  q?: string;
  ownerAgentId?: string;
  valueId?: string;
  sort?: string;
}

interface TransactionFilters {
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  verified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
  sort?: string;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    private readonly dataSource: DataSource,
  ) {}

  // ============= ACCOUNTS =============

  async createAccount(createAccountDto: CreateAccountDto): Promise<Account> {
    const { ownerAgentId, valueId, ...data } = createAccountDto;

    // Verify owner agent exists
    const ownerAgent = await this.agentRepository.findOne({ where: { id: ownerAgentId } });
    if (!ownerAgent) {
      throw new NotFoundException(`Agent with ID ${ownerAgentId} not found`);
    }

    // Verify value exists
    const value = await this.valueRepository.findOne({ where: { id: valueId } });
    if (!value) {
      throw new NotFoundException(`Value with ID ${valueId} not found`);
    }

    const account = this.accountRepository.create({
      ...data,
      ownerAgentId,
      valueId,
      balance: '0',
    });

    return this.accountRepository.save(account);
  }

  async findAllAccounts(filters: AccountFilters, options: IPaginationOptions): Promise<Pagination<Account>> {
    const queryBuilder = this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.ownerAgent', 'ownerAgent')
      .leftJoinAndSelect('account.value', 'value');

    // Apply filters
    if (filters.q) {
      queryBuilder.andWhere(
        '(account.name ILIKE :q OR account.description ILIKE :q)',
        { q: `%${filters.q}%` }
      );
    }

    if (filters.ownerAgentId) {
      queryBuilder.andWhere('account.ownerAgentId = :ownerAgentId', { ownerAgentId: filters.ownerAgentId });
    }

    if (filters.valueId) {
      queryBuilder.andWhere('account.valueId = :valueId', { valueId: filters.valueId });
    }

    // Apply sorting
    this.applyAccountSorting(queryBuilder, filters.sort);

    return paginate<Account>(queryBuilder, options);
  }

  private applyAccountSorting(queryBuilder: SelectQueryBuilder<Account>, sort?: string) {
    if (sort) {
      const [field, order] = sort.split('_');
      const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      switch (field) {
        case 'name':
          queryBuilder.orderBy('account.name', orderDirection);
          break;
        case 'balance':
          queryBuilder.orderBy('account.balance', orderDirection);
          break;
        case 'updatedAt':
          queryBuilder.orderBy('account.updatedAt', orderDirection);
          break;
        case 'createdAt':
          queryBuilder.orderBy('account.createdAt', orderDirection);
          break;
        default:
          queryBuilder.orderBy('account.updatedAt', 'DESC');
      }
    } else {
      queryBuilder.orderBy('account.updatedAt', 'DESC');
    }
  }

  async findOneAccount(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['ownerAgent', 'value'],
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async updateAccount(id: string, updateAccountDto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOneAccount(id);
    const { ownerAgentId, valueId, ...data } = updateAccountDto;

    // If changing valueId, check if account has transactions
    if (valueId !== undefined && valueId !== account.valueId) {
      const transactionCount = await this.transactionRepository.count({
        where: [
          { fromAccountId: id },
          { toAccountId: id },
        ],
      });

      if (transactionCount > 0) {
        throw new ConflictException('Cannot change value of an account with existing transactions');
      }

      // Verify new value exists
      const value = await this.valueRepository.findOne({ where: { id: valueId } });
      if (!value) {
        throw new NotFoundException(`Value with ID ${valueId} not found`);
      }

      account.valueId = valueId;
    }

    // If changing owner, verify new owner exists
    if (ownerAgentId !== undefined && ownerAgentId !== account.ownerAgentId) {
      const ownerAgent = await this.agentRepository.findOne({ where: { id: ownerAgentId } });
      if (!ownerAgent) {
        throw new NotFoundException(`Agent with ID ${ownerAgentId} not found`);
      }
      account.ownerAgentId = ownerAgentId;
    }

    Object.assign(account, data);
    return this.accountRepository.save(account);
  }

  async removeAccount(id: string): Promise<void> {
    const account = await this.findOneAccount(id);

    // Check if account has any transactions
    const transactionCount = await this.transactionRepository.count({
      where: [
        { fromAccountId: id },
        { toAccountId: id },
      ],
    });

    if (transactionCount > 0) {
      throw new ConflictException('Cannot delete account with existing transactions');
    }

    await this.accountRepository.remove(account);
  }

  // ============= TRANSACTIONS =============

  async createTransaction(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const { fromAccountId, toAccountId, amount, timestamp, verified, note } = createTransactionDto;

    // Validate accounts are different
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('From and To accounts must be different');
    }

    // Validate amount is not zero
    if (amount === 0) {
      throw new BadRequestException('Amount must not be zero');
    }

    // Get both accounts
    const [fromAccount, toAccount] = await Promise.all([
      this.findOneAccount(fromAccountId),
      this.findOneAccount(toAccountId),
    ]);

    // Validate same value
    if (fromAccount.valueId !== toAccount.valueId) {
      throw new BadRequestException('Cannot transact between accounts of different Value');
    }

    // Use a transaction to ensure atomicity
    return this.dataSource.transaction(async (manager) => {
      // Create the transaction
      const transaction = manager.create(Transaction, {
        fromAccountId,
        toAccountId,
        amount: amount.toString(),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        verified: verified ?? false,
        note: note ?? null,
      });

      const savedTransaction = await manager.save(transaction);

      // Update balances
      // fromAccount.balance -= amount
      // toAccount.balance += amount
      await manager.query(
        `UPDATE account SET balance = balance - $1 WHERE id = $2`,
        [amount, fromAccountId]
      );
      await manager.query(
        `UPDATE account SET balance = balance + $1 WHERE id = $2`,
        [amount, toAccountId]
      );

      return savedTransaction;
    });
  }

  async findAllTransactions(filters: TransactionFilters, options: IPaginationOptions): Promise<Pagination<Transaction>> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transaction.toAccount', 'toAccount');

    // Apply filters
    if (filters.accountId) {
      queryBuilder.andWhere(
        '(transaction.fromAccountId = :accountId OR transaction.toAccountId = :accountId)',
        { accountId: filters.accountId }
      );
    }

    if (filters.fromAccountId) {
      queryBuilder.andWhere('transaction.fromAccountId = :fromAccountId', { fromAccountId: filters.fromAccountId });
    }

    if (filters.toAccountId) {
      queryBuilder.andWhere('transaction.toAccountId = :toAccountId', { toAccountId: filters.toAccountId });
    }

    if (filters.verified !== undefined) {
      queryBuilder.andWhere('transaction.verified = :verified', { verified: filters.verified });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('transaction.timestamp >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('transaction.timestamp <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('CAST(transaction.amount AS DECIMAL) >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('CAST(transaction.amount AS DECIMAL) <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.q) {
      queryBuilder.andWhere('transaction.note ILIKE :q', { q: `%${filters.q}%` });
    }

    // Apply sorting
    this.applyTransactionSorting(queryBuilder, filters.sort);

    return paginate<Transaction>(queryBuilder, options);
  }

  private applyTransactionSorting(queryBuilder: SelectQueryBuilder<Transaction>, sort?: string) {
    if (sort) {
      const [field, order] = sort.split('_');
      const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      switch (field) {
        case 'timestamp':
          queryBuilder.orderBy('transaction.timestamp', orderDirection);
          break;
        case 'amount':
          queryBuilder.orderBy('transaction.amount', orderDirection);
          break;
        case 'createdAt':
          queryBuilder.orderBy('transaction.createdAt', orderDirection);
          break;
        default:
          queryBuilder.orderBy('transaction.timestamp', 'DESC');
      }
    } else {
      queryBuilder.orderBy('transaction.timestamp', 'DESC');
    }
  }

  async findOneTransaction(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['fromAccount', 'toAccount'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async updateTransaction(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.findOneTransaction(id);
    const { fromAccountId, toAccountId, amount, timestamp, verified, note } = updateTransactionDto;

    // Determine if we need to adjust balances
    const amountChanged = amount !== undefined && amount.toString() !== transaction.amount;
    const fromChanged = fromAccountId !== undefined && fromAccountId !== transaction.fromAccountId;
    const toChanged = toAccountId !== undefined && toAccountId !== transaction.toAccountId;

    // Validate new accounts if changing
    if (fromChanged || toChanged) {
      const newFromId = fromAccountId ?? transaction.fromAccountId;
      const newToId = toAccountId ?? transaction.toAccountId;

      if (newFromId === newToId) {
        throw new BadRequestException('From and To accounts must be different');
      }

      const [newFromAccount, newToAccount] = await Promise.all([
        this.findOneAccount(newFromId),
        this.findOneAccount(newToId),
      ]);

      if (newFromAccount.valueId !== newToAccount.valueId) {
        throw new BadRequestException('Cannot transact between accounts of different Value');
      }
    }

    // If balance-affecting fields changed, do atomic update
    if (amountChanged || fromChanged || toChanged) {
      return this.dataSource.transaction(async (manager) => {
        const oldAmount = parseFloat(transaction.amount);
        const newAmount = amount ?? oldAmount;
        const oldFromId = transaction.fromAccountId;
        const oldToId = transaction.toAccountId;
        const newFromId = fromAccountId ?? oldFromId;
        const newToId = toAccountId ?? oldToId;

        // Reverse old transaction effect
        await manager.query(
          `UPDATE account SET balance = balance + $1 WHERE id = $2`,
          [oldAmount, oldFromId]
        );
        await manager.query(
          `UPDATE account SET balance = balance - $1 WHERE id = $2`,
          [oldAmount, oldToId]
        );

        // Apply new transaction effect
        await manager.query(
          `UPDATE account SET balance = balance - $1 WHERE id = $2`,
          [newAmount, newFromId]
        );
        await manager.query(
          `UPDATE account SET balance = balance + $1 WHERE id = $2`,
          [newAmount, newToId]
        );

        // Update transaction
        transaction.fromAccountId = newFromId;
        transaction.toAccountId = newToId;
        transaction.amount = newAmount.toString();
        if (timestamp !== undefined) transaction.timestamp = new Date(timestamp);
        if (verified !== undefined) transaction.verified = verified;
        if (note !== undefined) transaction.note = note;

        return manager.save(transaction);
      });
    }

    // Only non-balance fields changed
    if (timestamp !== undefined) transaction.timestamp = new Date(timestamp);
    if (verified !== undefined) transaction.verified = verified;
    if (note !== undefined) transaction.note = note;

    return this.transactionRepository.save(transaction);
  }

  async verifyTransaction(id: string, verified: boolean): Promise<Transaction> {
    const transaction = await this.findOneTransaction(id);
    transaction.verified = verified;
    return this.transactionRepository.save(transaction);
  }

  async removeTransaction(id: string): Promise<void> {
    const transaction = await this.findOneTransaction(id);

    // Reverse the transaction effect atomically
    await this.dataSource.transaction(async (manager) => {
      const amount = parseFloat(transaction.amount);

      // Reverse: fromAccount gets amount back, toAccount loses amount
      await manager.query(
        `UPDATE account SET balance = balance + $1 WHERE id = $2`,
        [amount, transaction.fromAccountId]
      );
      await manager.query(
        `UPDATE account SET balance = balance - $1 WHERE id = $2`,
        [amount, transaction.toAccountId]
      );

      await manager.remove(transaction);
    });
  }

  // ============= ADMIN =============

  async recalculateBalances(): Promise<{ recalculatedAccounts: number }> {
    const accounts = await this.accountRepository.find();

    for (const account of accounts) {
      // Calculate balance from all transactions
      const result = await this.dataSource.query(`
        SELECT
          COALESCE(SUM(CASE WHEN "toAccountId" = $1 THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN "fromAccountId" = $1 THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as balance
        FROM ledger_transaction
        WHERE "fromAccountId" = $1 OR "toAccountId" = $1
      `, [account.id]);

      const calculatedBalance = result[0]?.balance ?? '0';

      await this.accountRepository.update(account.id, { balance: calculatedBalance });
    }

    return { recalculatedAccounts: accounts.length };
  }

  // ============= SEED =============

  async seed(): Promise<{ accounts: number; transactions: number }> {
    let accountsCreated = 0;
    let transactionsCreated = 0;

    // Find or create required agents
    const agents: Record<string, Agent> = {};
    const agentsSeed = [
      { name: 'Marketlum', type: AgentType.ORGANIZATION },
      { name: 'XYZ Inc.', type: AgentType.ORGANIZATION },
      { name: 'Paweł', type: AgentType.INDIVIDUAL },
    ];

    for (const agentData of agentsSeed) {
      let agent = await this.agentRepository.findOne({ where: { name: agentData.name } });
      if (!agent) {
        agent = this.agentRepository.create(agentData);
        agent = await this.agentRepository.save(agent);
      }
      agents[agentData.name] = agent;
    }

    // Find or create required values
    const values: Record<string, Value> = {};
    const valuesSeed = [
      { name: 'PLN', type: ValueType.PRODUCT },
      { name: 'EUR', type: ValueType.PRODUCT },
      { name: 'Marketlum Coaching', type: ValueType.SERVICE },
    ];

    for (const valueData of valuesSeed) {
      let value = await this.valueRepository.findOne({ where: { name: valueData.name } });
      if (!value) {
        value = this.valueRepository.create({ ...valueData, description: valueData.name });
        value = await this.valueRepository.save(value);
      }
      values[valueData.name] = value;
    }

    // Seed accounts
    const accountsSeed = [
      { name: 'Marketlum PLN', ownerName: 'Marketlum', valueName: 'PLN', description: 'Main PLN account for Marketlum' },
      { name: 'Marketlum EUR', ownerName: 'Marketlum', valueName: 'EUR', description: 'EUR account for Marketlum' },
      { name: 'Coaching for XYZ Inc.', ownerName: 'Marketlum', valueName: 'Marketlum Coaching', description: 'Coaching hours for XYZ Inc.' },
      { name: 'XYZ Inc. PLN', ownerName: 'XYZ Inc.', valueName: 'PLN', description: 'PLN account for XYZ Inc.' },
    ];

    const accounts: Record<string, Account> = {};

    for (const accountData of accountsSeed) {
      let account = await this.accountRepository.findOne({ where: { name: accountData.name } });
      if (!account) {
        account = await this.createAccount({
          name: accountData.name,
          ownerAgentId: agents[accountData.ownerName].id,
          valueId: values[accountData.valueName].id,
          description: accountData.description,
        });
        accountsCreated++;
      }
      accounts[accountData.name] = account;
    }

    // Seed transactions (only between same-value accounts)
    const existingTransactions = await this.transactionRepository.count();
    if (existingTransactions === 0) {
      // T1: XYZ Inc. PLN → Marketlum PLN, amount 5000
      await this.createTransaction({
        fromAccountId: accounts['XYZ Inc. PLN'].id,
        toAccountId: accounts['Marketlum PLN'].id,
        amount: 5000,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // last month
        verified: true,
        note: 'Coaching payment',
      });
      transactionsCreated++;

      // T2: Marketlum PLN correction entry
      await this.createTransaction({
        fromAccountId: accounts['Marketlum PLN'].id,
        toAccountId: accounts['XYZ Inc. PLN'].id,
        amount: 200,
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // last week
        verified: false,
        note: 'Correction entry - partial refund',
      });
      transactionsCreated++;

      // T3: Manual adjustment
      await this.createTransaction({
        fromAccountId: accounts['XYZ Inc. PLN'].id,
        toAccountId: accounts['Marketlum PLN'].id,
        amount: 100,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
        verified: true,
        note: 'Manual adjustment',
      });
      transactionsCreated++;
    }

    return { accounts: accountsCreated, transactions: transactionsCreated };
  }
}
