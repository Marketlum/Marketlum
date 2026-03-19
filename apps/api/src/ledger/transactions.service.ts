import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Account } from './entities/account.entity';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const { fromAccountId, toAccountId, ...rest } = input;

    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      throw new BadRequestException('From and to accounts must be different');
    }

    if (fromAccountId) {
      const fromAccount = await this.accountsRepository.findOne({ where: { id: fromAccountId } });
      if (!fromAccount) {
        throw new NotFoundException('From account not found');
      }
    }

    if (toAccountId) {
      const toAccount = await this.accountsRepository.findOne({ where: { id: toAccountId } });
      if (!toAccount) {
        throw new NotFoundException('To account not found');
      }
    }

    const transaction = this.repository.create({
      ...rest,
      fromAccountId: fromAccountId ?? null,
      toAccountId: toAccountId ?? null,
    });
    const saved = await this.repository.save(transaction);
    return this.findOne(saved.id);
  }

  async findAll(
    query: PaginationQuery & {
      fromAccountId?: string;
      toAccountId?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, fromAccountId, toAccountId } = query;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('tx');

    qb.leftJoinAndSelect('tx.fromAccount', 'fromAccount');
    qb.leftJoinAndSelect('tx.toAccount', 'toAccount');

    if (fromAccountId) {
      qb.andWhere('tx."fromAccountId" = :fromAccountId', { fromAccountId });
    }

    if (toAccountId) {
      qb.andWhere('tx."toAccountId" = :toAccountId', { toAccountId });
    }

    if (search) {
      qb.andWhere('tx.description ILIKE :search', { search: `%${search}%` });
    }

    if (sortBy) {
      qb.orderBy(`tx.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('tx.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.repository.findOne({
      where: { id },
      relations: ['fromAccount', 'toAccount'],
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const transaction = await this.findOne(id);
    const { fromAccountId, toAccountId, ...rest } = input;

    Object.assign(transaction, rest);

    if (fromAccountId !== undefined) {
      if (fromAccountId === null) {
        transaction.fromAccountId = null;
        transaction.fromAccount = null;
      } else {
        const fromAccount = await this.accountsRepository.findOne({ where: { id: fromAccountId } });
        if (!fromAccount) {
          throw new NotFoundException('From account not found');
        }
        transaction.fromAccountId = fromAccountId;
        transaction.fromAccount = fromAccount;
      }
    }

    if (toAccountId !== undefined) {
      if (toAccountId === null) {
        transaction.toAccountId = null;
        transaction.toAccount = null;
      } else {
        const toAccount = await this.accountsRepository.findOne({ where: { id: toAccountId } });
        if (!toAccount) {
          throw new NotFoundException('To account not found');
        }
        transaction.toAccountId = toAccountId;
        transaction.toAccount = toAccount;
      }
    }

    // Validate at least one account remains
    const effectiveFrom = transaction.fromAccountId;
    const effectiveTo = transaction.toAccountId;
    if (!effectiveFrom && !effectiveTo) {
      throw new BadRequestException('At least one account must be provided');
    }

    // Validate that effective from/to are different when both set
    if (effectiveFrom && effectiveTo && effectiveFrom === effectiveTo) {
      throw new BadRequestException('From and to accounts must be different');
    }

    await this.repository.save(transaction);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const transaction = await this.repository.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    await this.repository.remove(transaction);
  }
}
