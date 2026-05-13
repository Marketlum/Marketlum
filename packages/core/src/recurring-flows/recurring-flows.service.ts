import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { createActor } from 'xstate';
import {
  CreateRecurringFlowInput,
  UpdateRecurringFlowInput,
  RecurringFlowQuery,
  RecurringFlowStatus,
  RecurringFlowTransitionAction,
  recurringFlowMachine,
} from '@marketlum/shared';
import { RecurringFlow } from './entities/recurring-flow.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { Offering } from '../offerings/entities/offering.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';

@Injectable()
export class RecurringFlowsService {
  constructor(
    @InjectRepository(RecurringFlow)
    private readonly flowRepository: Repository<RecurringFlow>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: Repository<Taxonomy>,
  ) {}

  async create(input: CreateRecurringFlowInput): Promise<RecurringFlow> {
    const {
      valueStreamId,
      counterpartyAgentId,
      valueId,
      offeringId,
      agreementId,
      taxonomyIds,
      amount,
      unit,
      interval,
      ...rest
    } = input;

    await this.assertValueStreamExists(valueStreamId);
    await this.assertAgentExists(counterpartyAgentId);
    if (valueId) await this.assertValueExists(valueId);
    if (offeringId) await this.assertOfferingExists(offeringId);
    if (agreementId) await this.assertAgreementExists(agreementId);
    const taxonomies = taxonomyIds && taxonomyIds.length > 0
      ? await this.loadTaxonomies(taxonomyIds)
      : [];

    const flow = this.flowRepository.create({
      ...rest,
      amount: Number(amount).toFixed(4),
      unit: unit.trim(),
      interval: interval ?? 1,
      valueStreamId,
      counterpartyAgentId,
      valueId: valueId ?? null,
      offeringId: offeringId ?? null,
      agreementId: agreementId ?? null,
      endDate: rest.endDate ?? null,
      description: rest.description ?? null,
      status: RecurringFlowStatus.DRAFT,
      taxonomies,
    });

    const saved = await this.flowRepository.save(flow);
    return this.findOne(saved.id);
  }

  async search(query: RecurringFlowQuery) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      valueStreamId,
      counterpartyAgentId,
      direction,
      status,
      frequency,
      unit,
      taxonomyId,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.flowRepository.createQueryBuilder('flow');
    qb.leftJoinAndSelect('flow.valueStream', 'valueStream');
    qb.leftJoinAndSelect('flow.counterpartyAgent', 'counterpartyAgent');
    qb.leftJoinAndSelect('flow.value', 'value');
    qb.leftJoinAndSelect('flow.offering', 'offering');
    qb.leftJoinAndSelect('flow.agreement', 'agreement');
    qb.leftJoinAndSelect('flow.taxonomies', 'taxonomies');

    if (valueStreamId) qb.andWhere('flow.valueStreamId = :valueStreamId', { valueStreamId });
    if (counterpartyAgentId) qb.andWhere('flow.counterpartyAgentId = :counterpartyAgentId', { counterpartyAgentId });
    if (direction) qb.andWhere('flow.direction = :direction', { direction });

    if (status) {
      const arr = Array.isArray(status) ? status : [status];
      qb.andWhere('flow.status IN (:...statuses)', { statuses: arr });
    }

    if (frequency) {
      const arr = Array.isArray(frequency) ? frequency : [frequency];
      qb.andWhere('flow.frequency IN (:...frequencies)', { frequencies: arr });
    }

    if (unit) {
      const arr = Array.isArray(unit) ? unit : [unit];
      qb.andWhere('flow.unit IN (:...units)', { units: arr });
    }

    if (taxonomyId) {
      const arr = Array.isArray(taxonomyId) ? taxonomyId : [taxonomyId];
      qb.andWhere(
        'flow.id IN (SELECT "recurringFlowId" FROM recurring_flow_taxonomies WHERE "taxonomyId" IN (:...taxonomyIds))',
        { taxonomyIds: arr },
      );
    }

    if (search) {
      qb.andWhere('flow.description ILIKE :search', { search: `%${search}%` });
    }

    const allowedSortBy = new Set(['startDate', 'endDate', 'amount', 'status', 'direction', 'createdAt', 'updatedAt']);
    const sortColumn = sortBy && allowedSortBy.has(sortBy) ? sortBy : 'startDate';
    qb.orderBy(`flow.${sortColumn}`, sortOrder || 'DESC');

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<RecurringFlow> {
    const flow = await this.flowRepository.findOne({
      where: { id },
      relations: ['valueStream', 'counterpartyAgent', 'value', 'offering', 'agreement', 'taxonomies'],
    });
    if (!flow) throw new NotFoundException('Recurring flow not found');
    return flow;
  }

  async update(id: string, input: UpdateRecurringFlowInput): Promise<RecurringFlow> {
    const flow = await this.findOne(id);
    const {
      valueStreamId,
      counterpartyAgentId,
      valueId,
      offeringId,
      agreementId,
      taxonomyIds,
      amount,
      unit,
      ...rest
    } = input;

    if (valueStreamId !== undefined) {
      await this.assertValueStreamExists(valueStreamId);
      flow.valueStreamId = valueStreamId;
    }
    if (counterpartyAgentId !== undefined) {
      await this.assertAgentExists(counterpartyAgentId);
      flow.counterpartyAgentId = counterpartyAgentId;
    }
    if (valueId !== undefined) {
      if (valueId !== null) await this.assertValueExists(valueId);
      flow.valueId = valueId;
    }
    if (offeringId !== undefined) {
      if (offeringId !== null) await this.assertOfferingExists(offeringId);
      flow.offeringId = offeringId;
    }
    if (agreementId !== undefined) {
      if (agreementId !== null) await this.assertAgreementExists(agreementId);
      flow.agreementId = agreementId;
    }
    if (rest.direction !== undefined) flow.direction = rest.direction;
    if (amount !== undefined) flow.amount = Number(amount).toFixed(4);
    if (unit !== undefined) flow.unit = unit.trim();
    if (rest.frequency !== undefined) flow.frequency = rest.frequency;
    if (rest.interval !== undefined) flow.interval = rest.interval;
    if (rest.startDate !== undefined) flow.startDate = rest.startDate;
    if (rest.endDate !== undefined) flow.endDate = rest.endDate;
    if (rest.description !== undefined) flow.description = rest.description ?? null;

    if (taxonomyIds !== undefined) {
      flow.taxonomies = taxonomyIds.length > 0 ? await this.loadTaxonomies(taxonomyIds) : [];
    }

    // Clear lazy-loadable relations to avoid TypeORM trying to re-save them
    delete (flow as any).valueStream;
    delete (flow as any).counterpartyAgent;
    delete (flow as any).value;
    delete (flow as any).offering;
    delete (flow as any).agreement;

    await this.flowRepository.save(flow);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const flow = await this.findOne(id);
    if (flow.status !== RecurringFlowStatus.DRAFT) {
      throw new ConflictException(
        'Only draft flows can be deleted. End the flow first to preserve history.',
      );
    }
    await this.flowRepository.remove(flow);
  }

  async transition(
    id: string,
    action: RecurringFlowTransitionAction,
    endDate?: string,
  ): Promise<RecurringFlow> {
    const flow = await this.findOne(id);

    const actor = createActor(recurringFlowMachine, { snapshot: this.snapshotFor(flow.status) });
    actor.start();
    const before = actor.getSnapshot().value as RecurringFlowStatus;
    actor.send({ type: action });
    const after = actor.getSnapshot().value as RecurringFlowStatus;
    actor.stop();

    if (after === before) {
      throw new BadRequestException(`Illegal transition: ${flow.status} → ${action}`);
    }

    flow.status = after;

    if (after === RecurringFlowStatus.ENDED) {
      const today = new Date();
      const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
      flow.endDate = endDate ?? todayIso;
    }

    delete (flow as any).valueStream;
    delete (flow as any).counterpartyAgent;
    delete (flow as any).value;
    delete (flow as any).offering;
    delete (flow as any).agreement;

    await this.flowRepository.save(flow);
    return this.findOne(id);
  }

  private snapshotFor(status: RecurringFlowStatus) {
    return recurringFlowMachine.resolveState({ value: status, context: {} } as never);
  }

  private async assertValueStreamExists(id: string) {
    const exists = await this.valueStreamRepository.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Value stream not found');
  }

  private async assertAgentExists(id: string) {
    const exists = await this.agentRepository.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Agent not found');
  }

  private async assertValueExists(id: string) {
    const exists = await this.valueRepository.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Value not found');
  }

  private async assertOfferingExists(id: string) {
    const exists = await this.offeringRepository.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Offering not found');
  }

  private async assertAgreementExists(id: string) {
    const exists = await this.agreementRepository.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Agreement not found');
  }

  private async loadTaxonomies(ids: string[]): Promise<Taxonomy[]> {
    const taxonomies = await this.taxonomyRepository.findBy({ id: In(ids) });
    if (taxonomies.length !== ids.length) {
      throw new NotFoundException('One or more taxonomies not found');
    }
    return taxonomies;
  }
}
