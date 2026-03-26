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
import { Pipeline } from '../pipelines/entities/pipeline.entity';
import { User } from '../users/entities/user.entity';
import { Tension } from '../tensions/entities/tension.entity';
import {
  CreateExchangeInput,
  UpdateExchangeInput,
  ExchangeState,
  ExchangeTransitionAction,
  PaginationQuery,
  exchangeMachine,
} from '@marketlum/shared';
import { createActor, getNextSnapshot } from 'xstate';

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
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tension)
    private readonly tensionRepository: Repository<Tension>,
  ) {}

  async create(input: CreateExchangeInput): Promise<Exchange> {
    const { parties, valueStreamId, channelId, pipelineId, leadUserId, tensionId, ...rest } = input;

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

    // Validate pipeline
    if (pipelineId) {
      const pl = await this.pipelineRepository.findOne({ where: { id: pipelineId } });
      if (!pl) throw new NotFoundException('Pipeline not found');
    }

    // Validate lead user
    if (leadUserId) {
      const user = await this.userRepository.findOne({ where: { id: leadUserId } });
      if (!user) throw new NotFoundException('Lead user not found');
    }

    // Validate tension
    if (tensionId) {
      const tension = await this.tensionRepository.findOne({ where: { id: tensionId } });
      if (!tension) throw new NotFoundException('Tension not found');
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
      pipelineId: pipelineId ?? null,
      leadUserId: leadUserId ?? null,
      tensionId: tensionId ?? null,
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
        role: p.role ?? null,
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
        'pipeline',
        'lead',
        'tension',
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
      pipelineId?: string;
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
      pipelineId,
      partyAgentId,
      leadUserId,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.exchangeRepository.createQueryBuilder('exchange');
    qb.leftJoinAndSelect('exchange.valueStream', 'valueStream');
    qb.leftJoinAndSelect('exchange.channel', 'channel');
    qb.leftJoinAndSelect('exchange.pipeline', 'pipeline');
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

    if (pipelineId) {
      qb.andWhere('exchange.pipelineId = :pipelineId', { pipelineId });
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
    if (pipelineId) {
      countQb.andWhere('exchange.pipelineId = :pipelineId', { pipelineId });
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

  async transition(id: string, action: ExchangeTransitionAction): Promise<Exchange> {
    const exchange = await this.findOne(id);

    const nextSnapshot = getNextSnapshot(
      exchangeMachine,
      exchangeMachine.resolveState({ value: exchange.state, context: {} }),
      { type: action },
    );

    if (nextSnapshot.value === exchange.state) {
      throw new BadRequestException(
        `Cannot transition from ${exchange.state} using action "${action}"`,
      );
    }

    exchange.state = nextSnapshot.value as ExchangeState;
    if (exchange.state === ExchangeState.COMPLETED) {
      exchange.completedAt = new Date();
    }

    delete (exchange as any).parties;
    delete (exchange as any).flows;
    delete (exchange as any).valueStream;
    delete (exchange as any).channel;
    delete (exchange as any).pipeline;
    delete (exchange as any).lead;
    delete (exchange as any).tension;
    await this.exchangeRepository.save(exchange);

    return this.findOne(id);
  }

  async update(id: string, input: UpdateExchangeInput): Promise<Exchange> {
    const exchange = await this.findOne(id);
    const { parties, valueStreamId, channelId, pipelineId, leadUserId, tensionId, ...rest } = input;

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

    if (pipelineId !== undefined) {
      if (pipelineId === null) {
        exchange.pipeline = null;
        exchange.pipelineId = null;
      } else {
        const pl = await this.pipelineRepository.findOne({ where: { id: pipelineId } });
        if (!pl) throw new NotFoundException('Pipeline not found');
        exchange.pipelineId = pipelineId;
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

    if (tensionId !== undefined) {
      if (tensionId === null) {
        exchange.tension = null;
        exchange.tensionId = null;
      } else {
        const tension = await this.tensionRepository.findOne({ where: { id: tensionId } });
        if (!tension) throw new NotFoundException('Tension not found');
        exchange.tensionId = tensionId;
      }
    }

    // Delete relations before save to avoid cascade issues
    delete (exchange as any).parties;
    delete (exchange as any).flows;
    delete (exchange as any).valueStream;
    delete (exchange as any).channel;
    delete (exchange as any).pipeline;
    delete (exchange as any).lead;
    delete (exchange as any).tension;
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
    parties: { agentId: string; role?: string | null }[],
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
        role: p.role ?? null,
      }),
    );
    await this.partyRepository.save(partyEntities);
  }
}
