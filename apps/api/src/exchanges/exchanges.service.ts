import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Exchange, ExchangeState } from './entities/exchange.entity';
import { ExchangeParty } from './entities/exchange-party.entity';
import { ExchangeFlow } from './entities/exchange-flow.entity';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { TransitionExchangeDto } from './dto/transition-exchange.dto';
import { SetPartiesDto } from './dto/set-parties.dto';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateAgreementFromExchangeDto } from './dto/create-agreement-from-exchange.dto';
import { ValueStream } from '../value_streams/entities/value_stream.entity';
import { Agent, AgentType } from '../agents/entities/agent.entity';
import { Value, ValueType } from '../value/entities/value.entity';
import { Channel, ChannelType } from '../channels/entities/channel.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { User } from '../users/entities/user.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { AgreementParty } from '../agreements/entities/agreement-party.entity';

// State machine: allowed transitions
const ALLOWED_TRANSITIONS: Record<ExchangeState, ExchangeState[]> = {
  [ExchangeState.OPEN]: [ExchangeState.COMPLETED, ExchangeState.CLOSED],
  [ExchangeState.COMPLETED]: [ExchangeState.CLOSED],
  [ExchangeState.CLOSED]: [], // terminal state
};

type ExchangeFilters = {
  q?: string;
  state?: ExchangeState;
  valueStreamId?: string;
  leadUserId?: string;
  channelId?: string;
  taxonId?: string;
  agentId?: string;
  sort?: string;
};

type GroupedExchangesResponse = {
  groups: {
    valueStream: { id: string; name: string };
    exchanges: Exchange[];
  }[];
  total: number;
};

@Injectable()
export class ExchangesService {
  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    @InjectRepository(ExchangeParty)
    private readonly partyRepository: Repository<ExchangeParty>,
    @InjectRepository(ExchangeFlow)
    private readonly flowRepository: Repository<ExchangeFlow>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: Repository<Taxonomy>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
    @InjectRepository(AgreementParty)
    private readonly agreementPartyRepository: Repository<AgreementParty>,
  ) {}

  // ============= EXCHANGES CRUD =============

  async create(dto: CreateExchangeDto): Promise<Exchange> {
    // Validate value stream exists
    const valueStream = await this.valueStreamRepository.findOne({
      where: { id: dto.valueStreamId },
    });
    if (!valueStream) {
      throw new NotFoundException('Value stream not found');
    }

    // Create exchange
    const exchange = this.exchangeRepository.create({
      name: dto.name,
      purpose: dto.purpose ?? null,
      valueStreamId: dto.valueStreamId,
      channelId: dto.channelId ?? null,
      taxonId: dto.taxonId ?? null,
      agreementId: dto.agreementId ?? null,
      leadUserId: dto.leadUserId ?? null,
      state: ExchangeState.OPEN,
    });

    const savedExchange = await this.exchangeRepository.save(exchange);

    // Add parties if provided
    if (dto.partyAgentIds && dto.partyAgentIds.length > 0) {
      await this.setPartiesInternal(savedExchange.id, dto.partyAgentIds);
    }

    return this.findOne(savedExchange.id);
  }

  async findAll(filters: ExchangeFilters): Promise<GroupedExchangesResponse> {
    const qb = this.exchangeRepository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.valueStream', 'valueStream')
      .leftJoinAndSelect('exchange.channel', 'channel')
      .leftJoinAndSelect('exchange.taxon', 'taxon')
      .leftJoinAndSelect('exchange.leadUser', 'leadUser')
      .leftJoinAndSelect('exchange.parties', 'parties')
      .leftJoinAndSelect('parties.agent', 'partyAgent')
      .leftJoinAndSelect('exchange.flows', 'flows');

    // Apply filters
    if (filters.q) {
      qb.andWhere(
        '(exchange.name ILIKE :q OR exchange.purpose ILIKE :q)',
        { q: `%${filters.q}%` },
      );
    }

    if (filters.state) {
      qb.andWhere('exchange.state = :state', { state: filters.state });
    }

    if (filters.valueStreamId) {
      qb.andWhere('exchange.valueStreamId = :valueStreamId', {
        valueStreamId: filters.valueStreamId,
      });
    }

    if (filters.leadUserId) {
      qb.andWhere('exchange.leadUserId = :leadUserId', {
        leadUserId: filters.leadUserId,
      });
    }

    if (filters.channelId) {
      qb.andWhere('exchange.channelId = :channelId', {
        channelId: filters.channelId,
      });
    }

    if (filters.taxonId) {
      qb.andWhere('exchange.taxonId = :taxonId', { taxonId: filters.taxonId });
    }

    if (filters.agentId) {
      qb.andWhere((qb2) => {
        const subQuery = qb2
          .subQuery()
          .select('ep.exchangeId')
          .from(ExchangeParty, 'ep')
          .where('ep.agentId = :agentId')
          .getQuery();
        return `exchange.id IN ${subQuery}`;
      }).setParameter('agentId', filters.agentId);
    }

    // Apply sorting
    const [sortField, sortDir] = (filters.sort || 'updatedAt_desc').split('_');
    const direction = sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sortField) {
      case 'name':
        qb.orderBy('exchange.name', direction);
        break;
      case 'state':
        qb.orderBy('exchange.state', direction);
        break;
      case 'createdAt':
        qb.orderBy('exchange.createdAt', direction);
        break;
      default:
        qb.orderBy('exchange.updatedAt', direction);
    }

    const exchanges = await qb.getMany();

    // Group by ValueStream
    const groupMap = new Map<string, { valueStream: { id: string; name: string }; exchanges: Exchange[] }>();

    for (const exchange of exchanges) {
      const vsId = exchange.valueStreamId;
      if (!groupMap.has(vsId)) {
        groupMap.set(vsId, {
          valueStream: {
            id: exchange.valueStream.id,
            name: exchange.valueStream.name,
          },
          exchanges: [],
        });
      }
      groupMap.get(vsId)!.exchanges.push(exchange);
    }

    return {
      groups: Array.from(groupMap.values()),
      total: exchanges.length,
    };
  }

  async findOne(id: string): Promise<Exchange> {
    const exchange = await this.exchangeRepository.findOne({
      where: { id },
      relations: [
        'valueStream',
        'channel',
        'taxon',
        'agreement',
        'leadUser',
        'parties',
        'parties.agent',
        'flows',
        'flows.fromPartyAgent',
        'flows.toPartyAgent',
        'flows.value',
      ],
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    return exchange;
  }

  async update(id: string, dto: UpdateExchangeDto): Promise<Exchange> {
    const exchange = await this.findOne(id);

    if (dto.valueStreamId) {
      const valueStream = await this.valueStreamRepository.findOne({
        where: { id: dto.valueStreamId },
      });
      if (!valueStream) {
        throw new NotFoundException('Value stream not found');
      }
    }

    Object.assign(exchange, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.purpose !== undefined && { purpose: dto.purpose }),
      ...(dto.valueStreamId !== undefined && { valueStreamId: dto.valueStreamId }),
      ...(dto.channelId !== undefined && { channelId: dto.channelId }),
      ...(dto.taxonId !== undefined && { taxonId: dto.taxonId }),
      ...(dto.agreementId !== undefined && { agreementId: dto.agreementId }),
      ...(dto.leadUserId !== undefined && { leadUserId: dto.leadUserId }),
    });

    await this.exchangeRepository.save(exchange);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const exchange = await this.findOne(id);

    if (exchange.state !== ExchangeState.OPEN) {
      throw new ConflictException('Can only delete exchanges in open state');
    }

    await this.exchangeRepository.remove(exchange);
  }

  // ============= STATE TRANSITIONS =============

  async transition(id: string, dto: TransitionExchangeDto): Promise<Exchange> {
    const exchange = await this.findOne(id);
    const currentState = exchange.state;
    const targetState = dto.to;

    // Validate transition
    if (!ALLOWED_TRANSITIONS[currentState].includes(targetState)) {
      throw new ConflictException(
        `Cannot transition from ${currentState} to ${targetState}`,
      );
    }

    // Apply transition side effects
    const now = new Date();

    if (targetState === ExchangeState.COMPLETED) {
      exchange.completedAt = exchange.completedAt ?? now;
    }

    if (targetState === ExchangeState.CLOSED) {
      exchange.closedAt = exchange.closedAt ?? now;
    }

    exchange.state = targetState;
    await this.exchangeRepository.save(exchange);

    return this.findOne(id);
  }

  // ============= PARTIES MANAGEMENT =============

  async setParties(id: string, dto: SetPartiesDto): Promise<Exchange> {
    await this.findOne(id); // ensure exchange exists
    await this.setPartiesInternal(id, dto.partyAgentIds);
    return this.findOne(id);
  }

  private async setPartiesInternal(exchangeId: string, agentIds: string[]): Promise<void> {
    // Validate all agents exist
    if (agentIds.length > 0) {
      const agents = await this.agentRepository.find({
        where: { id: In(agentIds) },
      });
      if (agents.length !== agentIds.length) {
        throw new NotFoundException('One or more agents not found');
      }
    }

    // Remove existing parties
    await this.partyRepository.delete({ exchangeId });

    // Add new parties
    const parties = agentIds.map((agentId) =>
      this.partyRepository.create({ exchangeId, agentId }),
    );
    await this.partyRepository.save(parties);
  }

  // ============= FLOWS MANAGEMENT =============

  async createFlow(exchangeId: string, dto: CreateFlowDto): Promise<Exchange> {
    const exchange = await this.findOne(exchangeId);

    // Validate from/to are different
    if (dto.fromPartyAgentId === dto.toPartyAgentId) {
      throw new BadRequestException('From and To parties must be different');
    }

    // Validate both agents are parties of the exchange
    const partyAgentIds = exchange.parties.map((p) => p.agentId);
    if (!partyAgentIds.includes(dto.fromPartyAgentId)) {
      throw new BadRequestException('From agent is not a party of this exchange');
    }
    if (!partyAgentIds.includes(dto.toPartyAgentId)) {
      throw new BadRequestException('To agent is not a party of this exchange');
    }

    // Validate value exists
    const value = await this.valueRepository.findOne({
      where: { id: dto.valueId },
    });
    if (!value) {
      throw new NotFoundException('Value not found');
    }

    const flow = this.flowRepository.create({
      exchangeId,
      fromPartyAgentId: dto.fromPartyAgentId,
      toPartyAgentId: dto.toPartyAgentId,
      valueId: dto.valueId,
      quantity: dto.quantity ?? null,
      note: dto.note ?? null,
    });

    await this.flowRepository.save(flow);
    return this.findOne(exchangeId);
  }

  async updateFlow(
    exchangeId: string,
    flowId: string,
    dto: UpdateFlowDto,
  ): Promise<Exchange> {
    const exchange = await this.findOne(exchangeId);

    const flow = exchange.flows.find((f) => f.id === flowId);
    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    const fromAgentId = dto.fromPartyAgentId ?? flow.fromPartyAgentId;
    const toAgentId = dto.toPartyAgentId ?? flow.toPartyAgentId;

    // Validate from/to are different
    if (fromAgentId === toAgentId) {
      throw new BadRequestException('From and To parties must be different');
    }

    // Validate agents are parties
    const partyAgentIds = exchange.parties.map((p) => p.agentId);
    if (dto.fromPartyAgentId && !partyAgentIds.includes(dto.fromPartyAgentId)) {
      throw new BadRequestException('From agent is not a party of this exchange');
    }
    if (dto.toPartyAgentId && !partyAgentIds.includes(dto.toPartyAgentId)) {
      throw new BadRequestException('To agent is not a party of this exchange');
    }

    // Validate value if provided
    if (dto.valueId) {
      const value = await this.valueRepository.findOne({
        where: { id: dto.valueId },
      });
      if (!value) {
        throw new NotFoundException('Value not found');
      }
    }

    Object.assign(flow, {
      ...(dto.fromPartyAgentId !== undefined && { fromPartyAgentId: dto.fromPartyAgentId }),
      ...(dto.toPartyAgentId !== undefined && { toPartyAgentId: dto.toPartyAgentId }),
      ...(dto.valueId !== undefined && { valueId: dto.valueId }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.note !== undefined && { note: dto.note }),
    });

    await this.flowRepository.save(flow);
    return this.findOne(exchangeId);
  }

  async removeFlow(exchangeId: string, flowId: string): Promise<Exchange> {
    const exchange = await this.findOne(exchangeId);

    const flow = exchange.flows.find((f) => f.id === flowId);
    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    await this.flowRepository.remove(flow);
    return this.findOne(exchangeId);
  }

  // ============= AGREEMENT CREATION =============

  async createAgreementFromExchange(
    exchangeId: string,
    dto: CreateAgreementFromExchangeDto,
  ): Promise<{ agreementId: string; exchangeId: string }> {
    const exchange = await this.findOne(exchangeId);

    // Create agreement
    const agreement = new Agreement();
    agreement.title = dto.title;
    agreement.category = dto.category;
    agreement.gateway = dto.gateway;
    agreement.link = dto.link ?? undefined;
    agreement.content = dto.content ?? undefined;

    const savedAgreement = await this.agreementRepository.save(agreement);

    // Add exchange parties as agreement parties
    const agreementParties = exchange.parties.map((party) =>
      this.agreementPartyRepository.create({
        agreementId: savedAgreement.id,
        agentId: party.agentId,
      }),
    );
    await this.agreementPartyRepository.save(agreementParties);

    // Link agreement to exchange
    exchange.agreementId = savedAgreement.id;
    await this.exchangeRepository.save(exchange);

    return {
      agreementId: savedAgreement.id,
      exchangeId: exchange.id,
    };
  }

  // ============= SEED =============

  async seed(): Promise<{ exchanges: number; flows: number }> {
    let exchangesCreated = 0;
    let flowsCreated = 0;

    // Find or create agents
    const agents: Record<string, Agent> = {};
    const agentsSeed = [
      { name: 'Marketlum', type: AgentType.ORGANIZATION },
      { name: 'XYZ Inc.', type: AgentType.ORGANIZATION },
      { name: 'Jane Doe', type: AgentType.INDIVIDUAL },
      { name: 'Globex Corp', type: AgentType.ORGANIZATION },
    ];

    for (const agentData of agentsSeed) {
      let agent = await this.agentRepository.findOne({ where: { name: agentData.name } });
      if (!agent) {
        agent = this.agentRepository.create(agentData);
        agent = await this.agentRepository.save(agent);
      }
      agents[agentData.name] = agent;
    }

    // Find or create value streams
    const valueStreams: Record<string, ValueStream> = {};
    const valueStreamsSeed = [
      { name: 'Consulting', description: 'Consulting services' },
      { name: 'Software', description: 'Software products and licenses' },
    ];

    for (const vsData of valueStreamsSeed) {
      let vs = await this.valueStreamRepository.findOne({ where: { name: vsData.name } });
      if (!vs) {
        vs = this.valueStreamRepository.create(vsData);
        vs = await this.valueStreamRepository.save(vs);
      }
      valueStreams[vsData.name] = vs;
    }

    // Find or create values
    const values: Record<string, Value> = {};
    const valuesSeed = [
      { name: 'Coaching Session', type: ValueType.SERVICE, description: 'Professional coaching' },
      { name: 'Money PLN', type: ValueType.PRODUCT, description: 'Polish Zloty currency' },
      { name: 'Partnership', type: ValueType.RELATIONSHIP, description: 'Business partnership' },
      { name: 'Revenue Share', type: ValueType.RIGHT, description: 'Revenue sharing agreement' },
      { name: 'Business Development', type: ValueType.SERVICE, description: 'Business development services' },
    ];

    for (const valueData of valuesSeed) {
      let value = await this.valueRepository.findOne({ where: { name: valueData.name } });
      if (!value) {
        value = this.valueRepository.create(valueData);
        value = await this.valueRepository.save(value);
      }
      values[valueData.name] = value;
    }

    // Find or create channels
    const channels: Record<string, Channel> = {};
    const channelsSeed = [
      { name: 'Website', type: ChannelType.WEBSITE },
      { name: 'DocuSign', type: ChannelType.WEB_APP },
    ];

    for (const channelData of channelsSeed) {
      let channel = await this.channelRepository.findOne({ where: { name: channelData.name } });
      if (!channel) {
        channel = this.channelRepository.create(channelData);
        channel = await this.channelRepository.save(channel);
      }
      channels[channelData.name] = channel;
    }

    // Find or create taxons
    const taxons: Record<string, Taxonomy> = {};
    const taxonsSeed = [
      { name: 'Service Exchange' },
      { name: 'Partnership' },
    ];

    for (const taxonData of taxonsSeed) {
      let taxon = await this.taxonomyRepository.findOne({ where: { name: taxonData.name } });
      if (!taxon) {
        taxon = this.taxonomyRepository.create(taxonData);
        taxon = await this.taxonomyRepository.save(taxon);
      }
      taxons[taxonData.name] = taxon;
    }

    // Find admin user
    let adminUser = await this.userRepository.findOne({ where: { email: 'pawel@marketlum.com' } });

    // Seed exchanges
    type ExchangeSeedFlow = {
      fromAgent: string;
      toAgent: string;
      valueName: string;
      quantity?: number;
      note?: string;
    };

    const exchangesSeed: Array<{
      name: string;
      purpose?: string;
      state: ExchangeState;
      valueStreamName: string;
      channelName?: string;
      taxonName?: string;
      partyNames: string[];
      flows: ExchangeSeedFlow[];
      completedAt?: Date;
      closedAt?: Date;
    }> = [
      {
        name: 'Coaching for XYZ Inc.',
        purpose: 'Deliver 3-month coaching program',
        state: ExchangeState.OPEN,
        valueStreamName: 'Consulting',
        channelName: 'Website',
        taxonName: 'Service Exchange',
        partyNames: ['Marketlum', 'XYZ Inc.'],
        flows: [
          { fromAgent: 'XYZ Inc.', toAgent: 'Marketlum', valueName: 'Money PLN', quantity: 5000 },
          { fromAgent: 'Marketlum', toAgent: 'XYZ Inc.', valueName: 'Coaching Session', quantity: 6, note: 'Monthly coaching sessions' },
        ],
      },
      {
        name: 'Partnership with Jane Doe',
        purpose: 'Strategic partnership for business development',
        state: ExchangeState.COMPLETED,
        valueStreamName: 'Consulting',
        taxonName: 'Partnership',
        partyNames: ['Marketlum', 'Jane Doe'],
        completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        flows: [
          { fromAgent: 'Marketlum', toAgent: 'Jane Doe', valueName: 'Revenue Share', note: '15% of new client revenue' },
          { fromAgent: 'Jane Doe', toAgent: 'Marketlum', valueName: 'Business Development', note: 'Lead generation and referrals' },
        ],
      },
      {
        name: 'Cancelled pilot with Globex',
        purpose: 'Software pilot program that was cancelled',
        state: ExchangeState.CLOSED,
        valueStreamName: 'Software',
        partyNames: ['Marketlum', 'Globex Corp'],
        closedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        flows: [],
      },
      {
        name: 'Software License for XYZ Inc.',
        purpose: 'Enterprise software licensing agreement',
        state: ExchangeState.OPEN,
        valueStreamName: 'Software',
        channelName: 'DocuSign',
        partyNames: ['Marketlum', 'XYZ Inc.'],
        flows: [],
      },
      {
        name: 'Strategic Advisory for Globex',
        purpose: 'Market entry strategy consultation',
        state: ExchangeState.OPEN,
        valueStreamName: 'Consulting',
        taxonName: 'Service Exchange',
        partyNames: ['Marketlum', 'Globex Corp'],
        flows: [
          { fromAgent: 'Globex Corp', toAgent: 'Marketlum', valueName: 'Money PLN', quantity: 15000 },
          { fromAgent: 'Marketlum', toAgent: 'Globex Corp', valueName: 'Coaching Session', quantity: 10 },
        ],
      },
    ];

    for (const exchangeData of exchangesSeed) {
      let exchange = await this.exchangeRepository.findOne({
        where: { name: exchangeData.name },
      });

      if (!exchange) {
        exchange = this.exchangeRepository.create({
          name: exchangeData.name,
          purpose: exchangeData.purpose ?? null,
          state: exchangeData.state,
          valueStreamId: valueStreams[exchangeData.valueStreamName].id,
          channelId: exchangeData.channelName ? channels[exchangeData.channelName].id : null,
          taxonId: exchangeData.taxonName ? taxons[exchangeData.taxonName].id : null,
          leadUserId: adminUser?.id ?? null,
          completedAt: exchangeData.completedAt ?? null,
          closedAt: exchangeData.closedAt ?? null,
        });
        exchange = await this.exchangeRepository.save(exchange);
        exchangesCreated++;

        // Add parties
        for (const partyName of exchangeData.partyNames) {
          const party = this.partyRepository.create({
            exchangeId: exchange.id,
            agentId: agents[partyName].id,
          });
          await this.partyRepository.save(party);
        }

        // Add flows
        for (const flowData of exchangeData.flows) {
          const flow = this.flowRepository.create({
            exchangeId: exchange.id,
            fromPartyAgentId: agents[flowData.fromAgent].id,
            toPartyAgentId: agents[flowData.toAgent].id,
            valueId: values[flowData.valueName].id,
            quantity: flowData.quantity ?? null,
            note: flowData.note ?? null,
          });
          await this.flowRepository.save(flow);
          flowsCreated++;
        }
      }
    }

    return { exchanges: exchangesCreated, flows: flowsCreated };
  }
}
