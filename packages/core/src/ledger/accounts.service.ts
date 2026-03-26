import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { Value } from '../values/entities/value.entity';
import { Agent } from '../agents/entities/agent.entity';
import {
  CreateAccountInput,
  UpdateAccountInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly repository: Repository<Account>,
    @InjectRepository(Value)
    private readonly valuesRepository: Repository<Value>,
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
  ) {}

  async create(input: CreateAccountInput): Promise<Account> {
    const { valueId, agentId, ...rest } = input;

    const value = await this.valuesRepository.findOne({ where: { id: valueId } });
    if (!value) {
      throw new NotFoundException('Value not found');
    }

    const agent = await this.agentsRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const account = this.repository.create({ ...rest, valueId, agentId });
    const saved = await this.repository.save(account);
    return this.findOne(saved.id);
  }

  async findAll(
    query: PaginationQuery & {
      valueId?: string;
      agentId?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, valueId, agentId } = query;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('account');

    qb.leftJoinAndSelect('account.value', 'value');
    qb.leftJoinAndSelect('account.agent', 'agent');

    // Computed balance subquery
    qb.addSelect(
      `(
        COALESCE((SELECT SUM(t."amount") FROM "transactions" t WHERE t."toAccountId" = account.id), 0) -
        COALESCE((SELECT SUM(t."amount") FROM "transactions" t WHERE t."fromAccountId" = account.id), 0)
      )`,
      'account_balance',
    );

    if (valueId) {
      qb.andWhere('account."valueId" = :valueId', { valueId });
    }

    if (agentId) {
      qb.andWhere('account."agentId" = :agentId', { agentId });
    }

    if (search) {
      qb.andWhere('account.name ILIKE :search', { search: `%${search}%` });
    }

    if (sortBy === 'balance') {
      qb.orderBy('account_balance', sortOrder || 'ASC');
    } else if (sortBy) {
      qb.orderBy(`account.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('account.createdAt', 'DESC');
    }

    // Get total count separately (without the addSelect)
    const countQb = this.repository.createQueryBuilder('account');
    if (valueId) countQb.andWhere('account."valueId" = :valueId', { valueId });
    if (agentId) countQb.andWhere('account."agentId" = :agentId', { agentId });
    if (search) countQb.andWhere('account.name ILIKE :search', { search: `%${search}%` });
    const total = await countQb.getCount();

    qb.skip(skip).take(limit);

    const { entities, raw } = await qb.getRawAndEntities();

    // Map virtual balance onto entities
    const data = entities.map((entity, i) => {
      const balanceRaw = raw[i]?.account_balance;
      entity.balance = balanceRaw != null ? Number(balanceRaw).toFixed(2) : '0.00';
      return entity;
    });

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

  async findOne(id: string): Promise<Account> {
    const account = await this.repository.findOne({
      where: { id },
      relations: ['value', 'agent'],
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Compute balance
    const result = await this.repository.query(
      `SELECT
        COALESCE((SELECT SUM(t."amount") FROM "transactions" t WHERE t."toAccountId" = $1), 0) -
        COALESCE((SELECT SUM(t."amount") FROM "transactions" t WHERE t."fromAccountId" = $1), 0)
        AS balance`,
      [id],
    );
    account.balance = result[0]?.balance != null ? Number(result[0].balance).toFixed(2) : '0.00';

    return account;
  }

  async update(id: string, input: UpdateAccountInput): Promise<Account> {
    const account = await this.findOne(id);
    const { valueId, agentId, ...rest } = input;

    Object.assign(account, rest);

    if (valueId !== undefined) {
      const value = await this.valuesRepository.findOne({ where: { id: valueId } });
      if (!value) {
        throw new NotFoundException('Value not found');
      }
      account.valueId = valueId;
      account.value = value;
    }

    if (agentId !== undefined) {
      const agent = await this.agentsRepository.findOne({ where: { id: agentId } });
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      account.agentId = agentId;
      account.agent = agent;
    }

    await this.repository.save(account);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const account = await this.repository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    await this.repository.remove(account);
  }
}
