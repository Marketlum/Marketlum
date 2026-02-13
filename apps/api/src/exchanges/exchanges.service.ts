import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Exchange } from './entities/exchange.entity';
import { ExchangeParty } from './entities/exchange-party.entity';
import { Agent } from '../agents/entities/agent.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Channel } from '../channels/channel.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateExchangeInput,
  UpdateExchangeInput,
  ExchangeState,
  PaginationQuery,
} from '@marketlum/shared';

const ALLOWED_TRANSITIONS: Record<ExchangeState, ExchangeState[]> = {
  [ExchangeState.OPEN]: [ExchangeState.CLOSED, ExchangeState.COMPLETED],
  [ExchangeState.CLOSED]: [ExchangeState.OPEN],
  [ExchangeState.COMPLETED]: [],
};

@Injectable()
export class ExchangesService {
  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    @InjectRepository(ExchangeParty)
    private readonly partyRepository: Repository<ExchangeParty>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(input: CreateExchangeInput): Promise<Exchange> {
    const { parties, valueStreamId, channelId, leadUserId, ...rest } = input;

    // Validate valueStream
    if (valueStreamId) {
      const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
      if (!vs) throw new NotFoundException('Value stream not found');
    }

    // Validate channel
    if (channelId) {
      const ch = await this.channelRepository.findOne({ where: { id: channelId } });
      if (!ch) throw new NotFoundException('Channel not found');
    }

    // Validate lead user
    if (leadUserId) {
      const user = await this.userRepository.findOne({ where: { id: leadUserId } });
      if (!user) throw new NotFoundException('Lead user not found');
    }

    // Validate no duplicate agents in parties
    const agentIds = parties.map((p) => p.agentId);
    const uniqueAgentIds = [...new Set(agentIds)];
    if (uniqueAgentIds.length !== agentIds.length) {
      throw new BadRequestException('Duplicate agents in parties');
    }

    // Validate all party agents exist
    const agents = await this.agentRepository.findBy({ id: In(uniqueAgentIds) });
    if (agents.length !== uniqueAgentIds.length) {
      throw new NotFoundException('One or more party agents not found');
    }

    const exchange = this.exchangeRepository.create({
      ...rest,
      description: rest.description ?? null,
      link: rest.link ?? null,
      valueStreamId: valueStreamId ?? null,
      channelId: channelId ?? null,
      leadUserId: leadUserId ?? null,
      state: ExchangeState.OPEN,
      openedAt: new Date(),
      completedAt: null,
    });

    const saved = await this.exchangeRepository.save(exchange);

    // Create parties
    const partyEntities = parties.map((p) =>
      this.partyRepository.create({
        exchangeId: saved.id,
        agentId: p.agentId,
        role: p.role,
      }),
    );
    await this.partyRepository.save(partyEntities);

    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Exchange> {
    const exchange = await this.exchangeRepository.findOne({
      where: { id },
      relations: [
        'valueStream',
        'channel',
        'lead',
        'parties',
        'parties.agent',
      ],
    });
    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }
    return exchange;
  }

  async search(
    query: PaginationQuery & {
      state?: string;
      channelId?: string;
      valueStreamId?: string;
      partyAgentId?: string;
      leadUserId?: string;
    },
  ) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      state,
      channelId,
      valueStreamId,
      partyAgentId,
      leadUserId,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.exchangeRepository.createQueryBuilder('exchange');
    qb.leftJoinAndSelect('exchange.valueStream', 'valueStream');
    qb.leftJoinAndSelect('exchange.channel', 'channel');
    qb.leftJoinAndSelect('exchange.lead', 'lead');
    qb.leftJoinAndSelect('exchange.parties', 'parties');
    qb.leftJoinAndSelect('parties.agent', 'partyAgent');

    if (state) {
      qb.andWhere('exchange.state = :state', { state });
    }

    if (channelId) {
      qb.andWhere('exchange.channelId = :channelId', { channelId });
    }

    if (valueStreamId) {
      qb.andWhere('exchange.valueStreamId = :valueStreamId', { valueStreamId });
    }

    if (leadUserId) {
      qb.andWhere('exchange.leadUserId = :leadUserId', { leadUserId });
    }

    if (partyAgentId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM exchange_parties ep WHERE ep."exchangeId" = exchange.id AND ep."agentId" = :partyAgentId)`,
        { partyAgentId },
      );
    }

    if (search) {
      qb.andWhere(
        `exchange.search_vector @@ plainto_tsquery('english', :search)`,
        { search },
      );
    }

    if (sortBy) {
      qb.orderBy(`exchange.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('exchange.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const entities = await qb.getMany();

    // Count query
    const countQb = this.exchangeRepository.createQueryBuilder('exchange');

    if (state) {
      countQb.andWhere('exchange.state = :state', { state });
    }
    if (channelId) {
      countQb.andWhere('exchange.channelId = :channelId', { channelId });
    }
    if (valueStreamId) {
      countQb.andWhere('exchange.valueStreamId = :valueStreamId', { valueStreamId });
    }
    if (leadUserId) {
      countQb.andWhere('exchange.leadUserId = :leadUserId', { leadUserId });
    }
    if (partyAgentId) {
      countQb.andWhere(
        `EXISTS (SELECT 1 FROM exchange_parties ep WHERE ep."exchangeId" = exchange.id AND ep."agentId" = :partyAgentId)`,
        { partyAgentId },
      );
    }
    if (search) {
      countQb.andWhere(
        `exchange.search_vector @@ plainto_tsquery('english', :search)`,
        { search },
      );
    }

    const total = await countQb.getCount();

    return {
      data: entities,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, input: UpdateExchangeInput): Promise<Exchange> {
    const exchange = await this.findOne(id);
    const { parties, valueStreamId, channelId, leadUserId, state, ...rest } = input;

    // State transition validation
    if (state !== undefined && state !== exchange.state) {
      const allowed = ALLOWED_TRANSITIONS[exchange.state];
      if (!allowed.includes(state)) {
        throw new BadRequestException(
          `Cannot transition from ${exchange.state} to ${state}`,
        );
      }
      exchange.state = state;
      if (state === ExchangeState.COMPLETED) {
        exchange.completedAt = new Date();
      }
    }

    // Update scalar fields
    if (rest.name !== undefined) exchange.name = rest.name;
    if (rest.purpose !== undefined) exchange.purpose = rest.purpose;
    if (rest.description !== undefined) exchange.description = rest.description ?? null;
    if (rest.link !== undefined) exchange.link = rest.link ?? null;

    // Update relations
    if (valueStreamId !== undefined) {
      if (valueStreamId === null) {
        exchange.valueStream = null;
        exchange.valueStreamId = null;
      } else {
        const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
        if (!vs) throw new NotFoundException('Value stream not found');
        exchange.valueStreamId = valueStreamId;
      }
    }

    if (channelId !== undefined) {
      if (channelId === null) {
        exchange.channel = null;
        exchange.channelId = null;
      } else {
        const ch = await this.channelRepository.findOne({ where: { id: channelId } });
        if (!ch) throw new NotFoundException('Channel not found');
        exchange.channelId = channelId;
      }
    }

    if (leadUserId !== undefined) {
      if (leadUserId === null) {
        exchange.lead = null;
        exchange.leadUserId = null;
      } else {
        const user = await this.userRepository.findOne({ where: { id: leadUserId } });
        if (!user) throw new NotFoundException('Lead user not found');
        exchange.leadUserId = leadUserId;
      }
    }

    // Delete relations before save to avoid cascade issues
    delete (exchange as any).parties;
    delete (exchange as any).flows;
    delete (exchange as any).valueStream;
    delete (exchange as any).channel;
    delete (exchange as any).lead;
    await this.exchangeRepository.save(exchange);

    // Replace parties if provided
    if (parties !== undefined) {
      await this.replaceParties(id, parties);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const exchange = await this.exchangeRepository.findOne({ where: { id } });
    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }
    await this.exchangeRepository.remove(exchange);
  }

  async getPartyAgentIds(exchangeId: string): Promise<string[]> {
    const parties = await this.partyRepository.find({
      where: { exchangeId },
    });
    return parties.map((p) => p.agentId);
  }

  private async replaceParties(
    exchangeId: string,
    parties: { agentId: string; role: string }[],
  ): Promise<void> {
    await this.partyRepository.delete({ exchangeId });

    const agentIds = parties.map((p) => p.agentId);
    const uniqueAgentIds = [...new Set(agentIds)];
    if (uniqueAgentIds.length !== agentIds.length) {
      throw new BadRequestException('Duplicate agents in parties');
    }

    const agents = await this.agentRepository.findBy({ id: In(uniqueAgentIds) });
    if (agents.length !== uniqueAgentIds.length) {
      throw new NotFoundException('One or more party agents not found');
    }

    const partyEntities = parties.map((p) =>
      this.partyRepository.create({
        exchangeId,
        agentId: p.agentId,
        role: p.role,
      }),
    );
    await this.partyRepository.save(partyEntities);
  }
}
