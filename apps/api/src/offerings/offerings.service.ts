import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Offering, OfferingState } from './entities/offering.entity';
import { OfferingItem } from './entities/offering-item.entity';
import { Agent, AgentType } from '../agents/entities/agent.entity';
import { ValueStream } from '../value_streams/entities/value_stream.entity';
import { Value, ValueType } from '../value/entities/value.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CreateOfferingItemDto } from './dto/create-offering-item.dto';
import { UpdateOfferingItemDto } from './dto/update-offering-item.dto';
import { TransitionOfferingDto } from './dto/transition-offering.dto';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

interface OfferingFilters {
  q?: string;
  state?: OfferingState;
  agentId?: string;
  valueStreamId?: string;
  active?: boolean;
  sort?: string;
}

// State machine transitions
const ALLOWED_TRANSITIONS: Record<OfferingState, OfferingState[]> = {
  [OfferingState.DRAFT]: [OfferingState.LIVE, OfferingState.ARCHIVED],
  [OfferingState.LIVE]: [OfferingState.ARCHIVED],
  [OfferingState.ARCHIVED]: [],
};

@Injectable()
export class OfferingsService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(OfferingItem)
    private readonly offeringItemRepository: Repository<OfferingItem>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
  ) {}

  // ============= OFFERINGS =============

  async create(createOfferingDto: CreateOfferingDto): Promise<Offering> {
    const { agentId, valueStreamId, activeFrom, activeUntil, ...data } = createOfferingDto;

    // Verify agent exists
    const agent = await this.agentRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Verify value stream exists
    const valueStream = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
    if (!valueStream) {
      throw new NotFoundException(`Value Stream with ID ${valueStreamId} not found`);
    }

    // Validate date range
    if (activeFrom && activeUntil) {
      const fromDate = new Date(activeFrom);
      const untilDate = new Date(activeUntil);
      if (untilDate < fromDate) {
        throw new BadRequestException('activeUntil must be after activeFrom');
      }
    }

    const offering = this.offeringRepository.create({
      ...data,
      agentId,
      valueStreamId,
      activeFrom: activeFrom ? new Date(activeFrom) : null,
      activeUntil: activeUntil ? new Date(activeUntil) : null,
      state: OfferingState.DRAFT,
    });

    return this.offeringRepository.save(offering);
  }

  async findAll(
    filters: OfferingFilters,
    options: IPaginationOptions,
  ): Promise<Pagination<Offering>> {
    const queryBuilder = this.offeringRepository
      .createQueryBuilder('offering')
      .leftJoinAndSelect('offering.agent', 'agent')
      .leftJoinAndSelect('offering.valueStream', 'valueStream')
      .loadRelationCountAndMap('offering.itemsCount', 'offering.items')
      .loadRelationCountAndMap('offering.filesCount', 'offering.files');

    // Apply filters
    if (filters.q) {
      queryBuilder.andWhere(
        '(offering.name ILIKE :q OR offering.description ILIKE :q OR offering.purpose ILIKE :q)',
        { q: `%${filters.q}%` }
      );
    }

    if (filters.state) {
      queryBuilder.andWhere('offering.state = :state', { state: filters.state });
    }

    if (filters.agentId) {
      queryBuilder.andWhere('offering.agentId = :agentId', { agentId: filters.agentId });
    }

    if (filters.valueStreamId) {
      queryBuilder.andWhere('offering.valueStreamId = :valueStreamId', { valueStreamId: filters.valueStreamId });
    }

    if (filters.active === true) {
      const now = new Date();
      queryBuilder.andWhere('offering.state = :liveState', { liveState: OfferingState.LIVE });
      queryBuilder.andWhere('(offering.activeFrom IS NULL OR offering.activeFrom <= :now)', { now });
      queryBuilder.andWhere('(offering.activeUntil IS NULL OR offering.activeUntil >= :now)', { now });
    }

    // Apply sorting
    this.applySorting(queryBuilder, filters.sort);

    return paginate<Offering>(queryBuilder, options);
  }

  private applySorting(queryBuilder: SelectQueryBuilder<Offering>, sort?: string) {
    if (sort) {
      const [field, order] = sort.split('_');
      const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      switch (field) {
        case 'name':
          queryBuilder.orderBy('offering.name', orderDirection);
          break;
        case 'state':
          queryBuilder.orderBy('offering.state', orderDirection);
          break;
        case 'activeUntil':
          queryBuilder.orderBy('offering.activeUntil', orderDirection, 'NULLS LAST');
          break;
        case 'createdAt':
          queryBuilder.orderBy('offering.createdAt', orderDirection);
          break;
        case 'updatedAt':
        default:
          queryBuilder.orderBy('offering.updatedAt', orderDirection);
      }
    } else {
      queryBuilder.orderBy('offering.updatedAt', 'DESC');
    }
  }

  async findOne(id: string): Promise<Offering> {
    const offering = await this.offeringRepository.findOne({
      where: { id },
      relations: ['agent', 'valueStream', 'items', 'items.value', 'files'],
    });

    if (!offering) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    return offering;
  }

  async update(id: string, updateOfferingDto: UpdateOfferingDto): Promise<Offering> {
    const offering = await this.findOne(id);
    const { agentId, valueStreamId, activeFrom, activeUntil, ...data } = updateOfferingDto;

    // Verify agent if changing
    if (agentId && agentId !== offering.agentId) {
      const agent = await this.agentRepository.findOne({ where: { id: agentId } });
      if (!agent) {
        throw new NotFoundException(`Agent with ID ${agentId} not found`);
      }
      offering.agentId = agentId;
    }

    // Verify value stream if changing
    if (valueStreamId && valueStreamId !== offering.valueStreamId) {
      const valueStream = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
      if (!valueStream) {
        throw new NotFoundException(`Value Stream with ID ${valueStreamId} not found`);
      }
      offering.valueStreamId = valueStreamId;
    }

    // Handle dates
    if (activeFrom !== undefined) {
      offering.activeFrom = activeFrom ? new Date(activeFrom) : null;
    }
    if (activeUntil !== undefined) {
      offering.activeUntil = activeUntil ? new Date(activeUntil) : null;
    }

    // Validate date range
    if (offering.activeFrom && offering.activeUntil) {
      if (offering.activeUntil < offering.activeFrom) {
        throw new BadRequestException('activeUntil must be after activeFrom');
      }
    }

    Object.assign(offering, data);
    await this.offeringRepository.save(offering);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const offering = await this.findOne(id);

    if (offering.state !== OfferingState.DRAFT) {
      throw new ConflictException('Only draft offerings can be deleted');
    }

    await this.offeringRepository.remove(offering);
  }

  // ============= STATE TRANSITIONS =============

  async transition(id: string, transitionDto: TransitionOfferingDto): Promise<Offering> {
    const offering = await this.findOne(id);
    const { to } = transitionDto;

    // Check if transition is allowed
    const allowedTransitions = ALLOWED_TRANSITIONS[offering.state];
    if (!allowedTransitions.includes(to)) {
      throw new ConflictException(
        `Cannot transition from ${offering.state} to ${to}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // Additional validations for going live
    if (to === OfferingState.LIVE) {
      // Check if there's at least one item
      if (!offering.items || offering.items.length === 0) {
        throw new BadRequestException('Cannot go live without at least one offering item');
      }

      // Check activeUntil is not in the past
      if (offering.activeUntil && offering.activeUntil < new Date()) {
        throw new BadRequestException('Cannot go live with an activeUntil date in the past');
      }

      // Set activeFrom to now if not set
      if (!offering.activeFrom) {
        offering.activeFrom = new Date();
      }
    }

    offering.state = to;
    await this.offeringRepository.save(offering);

    return this.findOne(id);
  }

  // ============= OFFERING ITEMS =============

  async addItem(offeringId: string, createItemDto: CreateOfferingItemDto): Promise<OfferingItem> {
    const offering = await this.findOne(offeringId);
    const { valueId, quantity, pricingFormula, pricingLink } = createItemDto;

    // Verify value exists
    const value = await this.valueRepository.findOne({ where: { id: valueId } });
    if (!value) {
      throw new NotFoundException(`Value with ID ${valueId} not found`);
    }

    // Check for duplicate value in offering
    const existingItem = await this.offeringItemRepository.findOne({
      where: { offeringId, valueId },
    });
    if (existingItem) {
      throw new ConflictException('This value is already included in the offering');
    }

    const item = this.offeringItemRepository.create({
      offeringId,
      valueId,
      quantity: quantity ?? 1,
      pricingFormula: pricingFormula ?? null,
      pricingLink: pricingLink ?? null,
    });

    return this.offeringItemRepository.save(item);
  }

  async updateItem(offeringId: string, itemId: string, updateItemDto: UpdateOfferingItemDto): Promise<OfferingItem> {
    const item = await this.offeringItemRepository.findOne({
      where: { id: itemId, offeringId },
      relations: ['value'],
    });

    if (!item) {
      throw new NotFoundException(`Offering item with ID ${itemId} not found`);
    }

    Object.assign(item, updateItemDto);
    return this.offeringItemRepository.save(item);
  }

  async removeItem(offeringId: string, itemId: string): Promise<void> {
    const item = await this.offeringItemRepository.findOne({
      where: { id: itemId, offeringId },
    });

    if (!item) {
      throw new NotFoundException(`Offering item with ID ${itemId} not found`);
    }

    await this.offeringItemRepository.remove(item);
  }

  // ============= OFFERING FILES =============

  async attachFile(offeringId: string, fileId: string): Promise<Offering> {
    const offering = await this.findOne(offeringId);

    // Verify file exists
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Check if already attached
    const isAttached = offering.files.some(f => f.id === fileId);
    if (isAttached) {
      throw new ConflictException('File is already attached to this offering');
    }

    offering.files.push(file);
    await this.offeringRepository.save(offering);

    return this.findOne(offeringId);
  }

  async removeFile(offeringId: string, fileId: string): Promise<Offering> {
    const offering = await this.findOne(offeringId);

    const fileIndex = offering.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      throw new NotFoundException(`File with ID ${fileId} is not attached to this offering`);
    }

    offering.files.splice(fileIndex, 1);
    await this.offeringRepository.save(offering);

    return this.findOne(offeringId);
  }

  // ============= SEED =============

  async seed(): Promise<{ offerings: number; items: number }> {
    let offeringsCreated = 0;
    let itemsCreated = 0;

    // Find or create agents
    const agents: Record<string, Agent> = {};
    const agentsSeed = [
      { name: 'Marketlum', type: AgentType.ORGANIZATION },
      { name: 'XYZ Inc.', type: AgentType.ORGANIZATION },
      { name: 'Acme Corp', type: AgentType.ORGANIZATION },
      { name: 'TechStart Ltd', type: AgentType.ORGANIZATION },
      { name: 'GlobalTech Solutions', type: AgentType.ORGANIZATION },
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
      { name: 'Coaching Services', description: 'Professional coaching offerings' },
      { name: 'Software Licenses', description: 'Software licensing products' },
      { name: 'Training Programs', description: 'Educational and training offerings' },
      { name: 'Consulting Services', description: 'Expert consulting packages' },
      { name: 'Support Services', description: 'Technical and customer support' },
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
      { name: 'Coaching Session', type: ValueType.SERVICE },
      { name: 'Support Slack Access', type: ValueType.SERVICE },
      { name: 'Framework License', type: ValueType.RIGHT },
      { name: 'Workshop Attendance', type: ValueType.SERVICE },
      { name: 'Training Course', type: ValueType.SERVICE },
      { name: 'Consulting Hour', type: ValueType.SERVICE },
      { name: 'Priority Support', type: ValueType.SERVICE },
      { name: 'API Access', type: ValueType.RIGHT },
      { name: 'Data Export', type: ValueType.SERVICE },
      { name: 'White-label License', type: ValueType.RIGHT },
    ];

    for (const valueData of valuesSeed) {
      let value = await this.valueRepository.findOne({ where: { name: valueData.name } });
      if (!value) {
        value = this.valueRepository.create({ ...valueData, description: valueData.name });
        value = await this.valueRepository.save(value);
      }
      values[valueData.name] = value;
    }

    // Seed offerings
    type OfferingSeedItem = {
      valueName: string;
      quantity: number;
      pricingFormula?: string;
      pricingLink?: string;
    };

    const offeringsSeed: Array<{
      name: string;
      description: string;
      purpose: string;
      state: OfferingState;
      agentName: string;
      valueStreamName: string;
      activeFrom?: Date;
      activeUntil?: Date;
      items: OfferingSeedItem[];
    }> = [
      {
        name: 'Marketlum Coaching — XYZ Inc.',
        description: '3-month engagement for team transformation',
        purpose: 'Transform team into entrepreneurs',
        state: OfferingState.LIVE,
        agentName: 'Marketlum',
        valueStreamName: 'Coaching Services',
        activeFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Coaching Session', quantity: 6, pricingFormula: '€500 / session' },
          { valueName: 'Support Slack Access', quantity: 1 },
        ],
      },
      {
        name: 'Marketlum Framework License',
        description: 'Enterprise license for the Marketlum framework',
        purpose: 'Enable market-conscious development',
        state: OfferingState.DRAFT,
        agentName: 'Marketlum',
        valueStreamName: 'Software Licenses',
        items: [
          { valueName: 'Framework License', quantity: 1, pricingLink: 'https://marketlum.com/pricing' },
        ],
      },
      {
        name: 'Workshop: Build Your Market Map',
        description: 'Interactive workshop for mapping your market',
        purpose: 'Learn to visualize market relationships',
        state: OfferingState.ARCHIVED,
        agentName: 'Marketlum',
        valueStreamName: 'Coaching Services',
        activeUntil: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Workshop Attendance', quantity: 1, pricingFormula: '€200 / person' },
        ],
      },
      {
        name: 'Executive Leadership Coaching',
        description: 'One-on-one coaching for C-level executives',
        purpose: 'Develop strategic leadership capabilities',
        state: OfferingState.LIVE,
        agentName: 'Marketlum',
        valueStreamName: 'Coaching Services',
        activeFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Coaching Session', quantity: 12, pricingFormula: '€800 / session' },
          { valueName: 'Support Slack Access', quantity: 1 },
        ],
      },
      {
        name: 'Team Transformation Package',
        description: 'Complete team coaching and training program',
        purpose: 'Transform teams into high-performing units',
        state: OfferingState.LIVE,
        agentName: 'Acme Corp',
        valueStreamName: 'Training Programs',
        activeFrom: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        activeUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Training Course', quantity: 5, pricingFormula: '€1500 / course' },
          { valueName: 'Workshop Attendance', quantity: 10 },
        ],
      },
      {
        name: 'Startup Acceleration Program',
        description: 'Intensive 8-week program for early-stage startups',
        purpose: 'Accelerate startup growth and market fit',
        state: OfferingState.LIVE,
        agentName: 'TechStart Ltd',
        valueStreamName: 'Consulting Services',
        activeFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Consulting Hour', quantity: 40, pricingFormula: '€150 / hour' },
          { valueName: 'Coaching Session', quantity: 8 },
        ],
      },
      {
        name: 'Enterprise API Integration',
        description: 'Full API access with dedicated support',
        purpose: 'Enable seamless system integrations',
        state: OfferingState.LIVE,
        agentName: 'GlobalTech Solutions',
        valueStreamName: 'Software Licenses',
        activeFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'API Access', quantity: 1, pricingFormula: '€500 / month' },
          { valueName: 'Priority Support', quantity: 1 },
        ],
      },
      {
        name: 'White-label Platform License',
        description: 'Complete white-label solution for partners',
        purpose: 'Enable partners to offer branded solutions',
        state: OfferingState.DRAFT,
        agentName: 'GlobalTech Solutions',
        valueStreamName: 'Software Licenses',
        items: [
          { valueName: 'White-label License', quantity: 1, pricingLink: 'https://example.com/enterprise' },
          { valueName: 'API Access', quantity: 1 },
          { valueName: 'Priority Support', quantity: 1 },
        ],
      },
      {
        name: '24/7 Premium Support',
        description: 'Round-the-clock technical support with SLA',
        purpose: 'Ensure business continuity for critical operations',
        state: OfferingState.LIVE,
        agentName: 'GlobalTech Solutions',
        valueStreamName: 'Support Services',
        activeFrom: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Priority Support', quantity: 1, pricingFormula: '€2000 / month' },
        ],
      },
      {
        name: 'Data Migration Service',
        description: 'Complete data migration and validation package',
        purpose: 'Seamless transition to new platform',
        state: OfferingState.DRAFT,
        agentName: 'Acme Corp',
        valueStreamName: 'Consulting Services',
        items: [
          { valueName: 'Consulting Hour', quantity: 80, pricingFormula: '€120 / hour' },
          { valueName: 'Data Export', quantity: 1 },
        ],
      },
      {
        name: 'Agile Transformation Workshop',
        description: '2-day intensive workshop on agile methodologies',
        purpose: 'Introduce agile practices to traditional teams',
        state: OfferingState.LIVE,
        agentName: 'Marketlum',
        valueStreamName: 'Training Programs',
        activeFrom: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        activeUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Workshop Attendance', quantity: 2, pricingFormula: '€400 / day' },
          { valueName: 'Training Course', quantity: 1 },
        ],
      },
      {
        name: 'Quarterly Business Review Package',
        description: 'Comprehensive quarterly business analysis and planning',
        purpose: 'Strategic alignment and performance optimization',
        state: OfferingState.ARCHIVED,
        agentName: 'XYZ Inc.',
        valueStreamName: 'Consulting Services',
        activeUntil: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Consulting Hour', quantity: 20, pricingFormula: '€180 / hour' },
        ],
      },
      {
        name: 'Developer Certification Program',
        description: 'Complete certification path for platform developers',
        purpose: 'Build certified developer community',
        state: OfferingState.LIVE,
        agentName: 'TechStart Ltd',
        valueStreamName: 'Training Programs',
        activeFrom: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Training Course', quantity: 3, pricingFormula: '€800 / course' },
          { valueName: 'API Access', quantity: 1 },
        ],
      },
      {
        name: 'Managed Services Package',
        description: 'Full-service managed infrastructure and support',
        purpose: 'Offload operational burden to experts',
        state: OfferingState.DRAFT,
        agentName: 'GlobalTech Solutions',
        valueStreamName: 'Support Services',
        items: [
          { valueName: 'Priority Support', quantity: 1, pricingFormula: '€5000 / month' },
          { valueName: 'Consulting Hour', quantity: 10 },
          { valueName: 'Data Export', quantity: 1 },
        ],
      },
      {
        name: 'Innovation Sprint Facilitation',
        description: '1-week intensive innovation workshop',
        purpose: 'Generate and validate new product ideas',
        state: OfferingState.LIVE,
        agentName: 'Marketlum',
        valueStreamName: 'Consulting Services',
        activeFrom: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        activeUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Workshop Attendance', quantity: 5, pricingFormula: '€350 / day' },
          { valueName: 'Coaching Session', quantity: 2 },
        ],
      },
      {
        name: 'Legacy System Integration',
        description: 'Connect legacy systems with modern APIs',
        purpose: 'Bridge old and new technology stacks',
        state: OfferingState.ARCHIVED,
        agentName: 'Acme Corp',
        valueStreamName: 'Consulting Services',
        activeUntil: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Consulting Hour', quantity: 100, pricingFormula: '€140 / hour' },
          { valueName: 'API Access', quantity: 1 },
        ],
      },
      {
        name: 'Customer Success Onboarding',
        description: 'Comprehensive onboarding program for new customers',
        purpose: 'Ensure successful platform adoption',
        state: OfferingState.LIVE,
        agentName: 'XYZ Inc.',
        valueStreamName: 'Support Services',
        activeFrom: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
        items: [
          { valueName: 'Training Course', quantity: 2, pricingFormula: '€600 / course' },
          { valueName: 'Support Slack Access', quantity: 1 },
          { valueName: 'Priority Support', quantity: 1 },
        ],
      },
    ];

    for (const offeringData of offeringsSeed) {
      let offering = await this.offeringRepository.findOne({
        where: { name: offeringData.name },
      });

      if (!offering) {
        offering = this.offeringRepository.create({
          name: offeringData.name,
          description: offeringData.description,
          purpose: offeringData.purpose,
          state: offeringData.state,
          agentId: agents[offeringData.agentName].id,
          valueStreamId: valueStreams[offeringData.valueStreamName].id,
          activeFrom: offeringData.activeFrom ?? null,
          activeUntil: offeringData.activeUntil ?? null,
        });
        offering = await this.offeringRepository.save(offering);
        offeringsCreated++;

        // Add items
        for (const itemData of offeringData.items) {
          const item = this.offeringItemRepository.create({
            offeringId: offering.id,
            valueId: values[itemData.valueName].id,
            quantity: itemData.quantity,
            pricingFormula: itemData.pricingFormula ?? null,
            pricingLink: itemData.pricingLink ?? null,
          });
          await this.offeringItemRepository.save(item);
          itemsCreated++;
        }
      }
    }

    return { offerings: offeringsCreated, items: itemsCreated };
  }
}
