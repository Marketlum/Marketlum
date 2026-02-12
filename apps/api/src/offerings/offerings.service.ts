import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Offering } from './entities/offering.entity';
import { OfferingComponent } from './entities/offering-component.entity';
import { Agent } from '../agents/entities/agent.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Value } from '../values/entities/value.entity';
import {
  CreateOfferingInput,
  UpdateOfferingInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class OfferingsService {
  constructor(
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(OfferingComponent)
    private readonly componentRepository: Repository<OfferingComponent>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
  ) {}

  async create(input: CreateOfferingInput): Promise<Offering> {
    const { valueStreamId, agentId, components, ...rest } = input;

    if (valueStreamId) {
      const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
      if (!vs) throw new NotFoundException('Value stream not found');
    }

    if (agentId) {
      const agent = await this.agentRepository.findOne({ where: { id: agentId } });
      if (!agent) throw new NotFoundException('Agent not found');
    }

    const offering = this.offeringRepository.create({
      ...rest,
      purpose: rest.purpose ?? null,
      description: rest.description ?? null,
      link: rest.link ?? null,
      activeFrom: rest.activeFrom ? new Date(rest.activeFrom) : null,
      activeUntil: rest.activeUntil ? new Date(rest.activeUntil) : null,
      valueStreamId: valueStreamId ?? null,
      agentId: agentId ?? null,
    });

    const saved = await this.offeringRepository.save(offering);

    if (components && components.length > 0) {
      await this.replaceComponents(saved.id, components);
    }

    return this.findOne(saved.id);
  }

  async search(
    query: PaginationQuery & {
      state?: string;
      agentId?: string;
      valueStreamId?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, state, agentId, valueStreamId } = query;
    const skip = (page - 1) * limit;

    const qb = this.offeringRepository.createQueryBuilder('offering');

    qb.leftJoinAndSelect('offering.valueStream', 'valueStream');
    qb.leftJoinAndSelect('offering.agent', 'agent');
    qb.leftJoinAndSelect('offering.components', 'components');
    qb.leftJoinAndSelect('components.value', 'componentValue');

    if (state) {
      qb.andWhere('offering.state = :state', { state });
    }

    if (agentId) {
      qb.andWhere('offering.agentId = :agentId', { agentId });
    }

    if (valueStreamId) {
      qb.andWhere('offering.valueStreamId = :valueStreamId', { valueStreamId });
    }

    if (search) {
      qb.andWhere(
        '(offering.name ILIKE :search OR offering.purpose ILIKE :search OR offering.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`offering.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('offering.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Offering> {
    const offering = await this.offeringRepository.findOne({
      where: { id },
      relations: ['valueStream', 'agent', 'components', 'components.value'],
    });
    if (!offering) {
      throw new NotFoundException('Offering not found');
    }
    return offering;
  }

  async update(id: string, input: UpdateOfferingInput): Promise<Offering> {
    const offering = await this.findOne(id);
    const { valueStreamId, agentId, components, ...rest } = input;

    if (rest.name !== undefined) offering.name = rest.name;
    if (rest.purpose !== undefined) offering.purpose = rest.purpose ?? null;
    if (rest.description !== undefined) offering.description = rest.description ?? null;
    if (rest.link !== undefined) offering.link = rest.link ?? null;
    if (rest.state !== undefined) offering.state = rest.state;
    if (rest.activeFrom !== undefined) {
      offering.activeFrom = rest.activeFrom ? new Date(rest.activeFrom) : null;
    }
    if (rest.activeUntil !== undefined) {
      offering.activeUntil = rest.activeUntil ? new Date(rest.activeUntil) : null;
    }

    if (valueStreamId !== undefined) {
      if (valueStreamId === null) {
        offering.valueStream = null;
        offering.valueStreamId = null;
      } else {
        const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
        if (!vs) throw new NotFoundException('Value stream not found');
        offering.valueStreamId = valueStreamId;
        offering.valueStream = vs;
      }
    }

    if (agentId !== undefined) {
      if (agentId === null) {
        offering.agent = null;
        offering.agentId = null;
      } else {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw new NotFoundException('Agent not found');
        offering.agentId = agentId;
        offering.agent = agent;
      }
    }

    // Delete components relation before save to avoid cascade inserting malformed rows
    delete (offering as any).components;
    await this.offeringRepository.save(offering);

    if (components !== undefined) {
      await this.replaceComponents(id, components);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const offering = await this.findOne(id);
    await this.offeringRepository.remove(offering);
  }

  private async replaceComponents(
    offeringId: string,
    components: { valueId: string; quantity: string; pricingFormula?: string; pricingLink?: string }[],
  ): Promise<void> {
    // Delete existing components
    await this.componentRepository.delete({ offeringId });

    if (components.length === 0) return;

    // Validate all valueIds exist
    const valueIds = components.map((c) => c.valueId);
    const values = await this.valueRepository.findBy({ id: In(valueIds) });
    if (values.length !== valueIds.length) {
      throw new NotFoundException('One or more values not found');
    }

    // Bulk create new components
    const entities = components.map((c) =>
      this.componentRepository.create({
        offeringId,
        valueId: c.valueId,
        quantity: c.quantity,
        pricingFormula: c.pricingFormula ?? null,
        pricingLink: c.pricingLink ?? null,
      }),
    );
    await this.componentRepository.save(entities);
  }
}
