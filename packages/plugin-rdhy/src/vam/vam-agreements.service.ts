import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Agent, Agreement, Value } from '@marketlum/core';
import { RdhyPlatform } from '../platforms/rdhy-platform.entity';
import { RdhyVamAgreement } from './rdhy-vam-agreement.entity';
import { RdhyVamMilestone } from './rdhy-vam-milestone.entity';
import { RdhyVamItem } from './rdhy-vam-item.entity';
import { RdhyVamCostEntry } from './rdhy-vam-cost-entry.entity';
import { RdhyVamInvestmentEntry } from './rdhy-vam-investment-entry.entity';
import { RdhyVamTerminationCondition } from './rdhy-vam-termination-condition.entity';
import type {
  CreateVamAgreementInput,
  RdhyVamAgreementDocument,
  RdhyVamAgreementSummary,
  TerminateVamAgreementInput,
  UpdateVamAgreementInput,
  VamCanvasInput,
} from '../shared/vam-schemas';

@Injectable()
export class VamAgreementsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RdhyVamAgreement)
    private readonly agreementRepository: Repository<RdhyVamAgreement>,
    @InjectRepository(RdhyVamMilestone)
    private readonly milestoneRepository: Repository<RdhyVamMilestone>,
    @InjectRepository(RdhyVamItem)
    private readonly itemRepository: Repository<RdhyVamItem>,
    @InjectRepository(RdhyVamCostEntry)
    private readonly costRepository: Repository<RdhyVamCostEntry>,
    @InjectRepository(RdhyVamInvestmentEntry)
    private readonly investmentRepository: Repository<RdhyVamInvestmentEntry>,
    @InjectRepository(RdhyVamTerminationCondition)
    private readonly terminationRepository: Repository<RdhyVamTerminationCondition>,
    @InjectRepository(Agent)
    private readonly coreAgentRepository: Repository<Agent>,
    @InjectRepository(RdhyPlatform)
    private readonly platformRepository: Repository<RdhyPlatform>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(Agreement)
    private readonly coreAgreementRepository: Repository<Agreement>,
  ) {}

  async create(input: CreateVamAgreementInput): Promise<RdhyVamAgreementSummary> {
    await this.validateReferences(input);
    const saved = await this.agreementRepository.save(
      this.agreementRepository.create({
        title: input.title,
        agentId: input.agentId,
        platformId: input.platformId,
        horizonMonths: input.horizonMonths,
        currencyId: input.currencyId ?? null,
        agreementId: input.agreementId ?? null,
        status: 'DRAFT',
      }),
    );
    return this.toSummary(await this.reload(saved.id));
  }

  async findAll(): Promise<RdhyVamAgreementSummary[]> {
    const agreements = await this.agreementRepository.find({
      relations: ['agent', 'platform', 'currency'],
      order: { updatedAt: 'DESC' },
    });
    return agreements.map((a) => this.toSummary(a));
  }

  async findByPlatform(platformId: string): Promise<RdhyVamAgreementSummary[]> {
    const platform = await this.platformRepository.findOne({ where: { id: platformId } });
    if (!platform) throw new NotFoundException('RDHY platform not found');
    const agreements = await this.agreementRepository.find({
      where: { platformId },
      relations: ['agent', 'platform', 'currency'],
      order: { updatedAt: 'DESC' },
    });
    return agreements.map((a) => this.toSummary(a));
  }

  async countByPlatform(platformId: string): Promise<number> {
    return this.agreementRepository.count({ where: { platformId } });
  }

  async findOne(id: string): Promise<RdhyVamAgreementDocument> {
    const agreement = await this.reload(id);
    return this.toDocument(agreement);
  }

  async updateMetadata(
    id: string,
    input: UpdateVamAgreementInput,
  ): Promise<RdhyVamAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft VAM agreements can be updated');
    await this.validateReferences(input);
    if (input.title !== undefined) agreement.title = input.title;
    if (input.agentId !== undefined) agreement.agentId = input.agentId;
    if (input.platformId !== undefined) agreement.platformId = input.platformId;
    if (input.horizonMonths !== undefined) agreement.horizonMonths = input.horizonMonths;
    if (input.currencyId !== undefined) agreement.currencyId = input.currencyId ?? null;
    if (input.agreementId !== undefined) agreement.agreementId = input.agreementId ?? null;
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async replaceCanvas(id: string, canvas: VamCanvasInput): Promise<RdhyVamAgreementDocument> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft VAM agreements can have their canvas edited');

    const offsets = canvas.milestones.map((m) => m.offsetMonths);
    if (new Set(offsets).size !== offsets.length) {
      throw new BadRequestException('Milestone offsets must be unique');
    }
    const beyond = offsets.find((o) => o > agreement.horizonMonths);
    if (beyond !== undefined) {
      throw new BadRequestException(
        `Milestone offset ${beyond} exceeds the agreement horizon of ${agreement.horizonMonths} months`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Items cascade from milestones at the DB level.
      await manager.delete(RdhyVamMilestone, { agreementId: id });
      await manager.delete(RdhyVamCostEntry, { agreementId: id });
      await manager.delete(RdhyVamInvestmentEntry, { agreementId: id });
      await manager.delete(RdhyVamTerminationCondition, { agreementId: id });

      for (const [mi, milestone] of canvas.milestones.entries()) {
        const savedMilestone = await manager.save(
          manager.create(RdhyVamMilestone, {
            agreementId: id,
            offsetMonths: milestone.offsetMonths,
            label: milestone.label ?? null,
            position: mi,
          }),
        );
        for (const [ii, item] of milestone.items.entries()) {
          await manager.save(
            manager.create(RdhyVamItem, {
              milestoneId: savedMilestone.id,
              track: item.track,
              description: item.description,
              amount: item.amount != null ? String(item.amount) : null,
              position: ii,
            }),
          );
        }
      }
      for (const [ci, cost] of canvas.costEntries.entries()) {
        await manager.save(
          manager.create(RdhyVamCostEntry, {
            agreementId: id,
            category: cost.category,
            label: cost.label,
            amount: String(cost.amount),
            headcount: cost.headcount ?? null,
            position: ci,
          }),
        );
      }
      for (const [vi, investment] of canvas.investmentEntries.entries()) {
        await manager.save(
          manager.create(RdhyVamInvestmentEntry, {
            agreementId: id,
            kind: investment.kind,
            label: investment.label ?? null,
            amount: String(investment.amount),
            position: vi,
          }),
        );
      }
      for (const [ti, text] of canvas.terminationConditions.entries()) {
        await manager.save(
          manager.create(RdhyVamTerminationCondition, { agreementId: id, position: ti, text }),
        );
      }
      // Bump updatedAt so list ordering reflects canvas edits.
      await manager.update(RdhyVamAgreement, id, { updatedAt: new Date() });
    });

    return this.findOne(id);
  }

  async activate(id: string): Promise<RdhyVamAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft VAM agreements can be activated');
    const activeSibling = await this.agreementRepository.findOne({
      where: { agentId: agreement.agentId, status: 'ACTIVE' },
    });
    if (activeSibling) {
      throw new ConflictException('An active VAM agreement already exists for this agent');
    }
    agreement.status = 'ACTIVE';
    agreement.startedAt = new Date();
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async complete(id: string): Promise<RdhyVamAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'ACTIVE', 'Only active VAM agreements can be completed');
    agreement.status = 'COMPLETED';
    agreement.endedAt = new Date();
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async terminate(
    id: string,
    input: TerminateVamAgreementInput,
  ): Promise<RdhyVamAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'ACTIVE', 'Only active VAM agreements can be terminated');

    const rules = await this.terminationRepository.find({ where: { agreementId: id } });
    const citedId = input.citedTerminationConditionId ?? null;
    if (rules.length > 0 && !citedId) {
      throw new BadRequestException(
        'Terminating this agreement requires citing one of its termination conditions',
      );
    }
    if (citedId && !rules.some((r) => r.id === citedId)) {
      throw new BadRequestException(
        'The cited termination condition does not belong to this agreement',
      );
    }

    agreement.status = 'TERMINATED';
    agreement.endedAt = new Date();
    agreement.citedTerminationConditionId = citedId;
    agreement.terminationNote = input.note ?? null;
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft VAM agreements can be deleted');
    await this.agreementRepository.remove(agreement);
  }

  private async validateReferences(
    input: Partial<CreateVamAgreementInput>,
  ): Promise<void> {
    if (input.agentId !== undefined) {
      const agent = await this.coreAgentRepository.findOne({ where: { id: input.agentId } });
      if (!agent) throw new NotFoundException('Agent not found');
    }
    if (input.platformId !== undefined) {
      const platform = await this.platformRepository.findOne({ where: { id: input.platformId } });
      if (!platform) throw new NotFoundException('RDHY platform not found');
    }
    if (input.currencyId != null) {
      const currency = await this.valueRepository.findOne({ where: { id: input.currencyId } });
      if (!currency) throw new NotFoundException('Currency value not found');
    }
    if (input.agreementId != null) {
      const coreAgreement = await this.coreAgreementRepository.findOne({
        where: { id: input.agreementId },
      });
      if (!coreAgreement) throw new NotFoundException('Core agreement not found');
    }
  }

  private async requireAgreement(id: string): Promise<RdhyVamAgreement> {
    const agreement = await this.agreementRepository.findOne({ where: { id } });
    if (!agreement) throw new NotFoundException('VAM agreement not found');
    return agreement;
  }

  private requireStatus(
    agreement: RdhyVamAgreement,
    status: RdhyVamAgreement['status'],
    message: string,
  ): void {
    if (agreement.status !== status) throw new ConflictException(message);
  }

  private async reload(id: string): Promise<RdhyVamAgreement> {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['agent', 'platform', 'currency'],
    });
    if (!agreement) throw new NotFoundException('VAM agreement not found');
    return agreement;
  }

  private toSummary(agreement: RdhyVamAgreement): RdhyVamAgreementSummary {
    return {
      id: agreement.id,
      title: agreement.title,
      status: agreement.status,
      horizonMonths: agreement.horizonMonths,
      startedAt: agreement.startedAt ? agreement.startedAt.toISOString() : null,
      endedAt: agreement.endedAt ? agreement.endedAt.toISOString() : null,
      agent: {
        id: agreement.agent.id,
        name: agreement.agent.name,
        type: agreement.agent.type,
      },
      platform: {
        id: agreement.platform.id,
        code: agreement.platform.code,
        name: agreement.platform.name,
      },
      currency: agreement.currency
        ? {
            id: agreement.currency.id,
            code: agreement.currency.code,
            name: agreement.currency.name,
          }
        : null,
      agreementId: agreement.agreementId,
      createdAt: agreement.createdAt.toISOString(),
      updatedAt: agreement.updatedAt.toISOString(),
    };
  }

  private async toDocument(agreement: RdhyVamAgreement): Promise<RdhyVamAgreementDocument> {
    const milestones = await this.milestoneRepository.find({
      where: { agreementId: agreement.id },
      order: { position: 'ASC' },
    });
    const items = milestones.length
      ? await this.itemRepository.find({
          where: { milestoneId: In(milestones.map((m) => m.id)) },
          order: { position: 'ASC' },
        })
      : [];
    const costEntries = await this.costRepository.find({
      where: { agreementId: agreement.id },
      order: { position: 'ASC' },
    });
    const investmentEntries = await this.investmentRepository.find({
      where: { agreementId: agreement.id },
      order: { position: 'ASC' },
    });
    const terminationConditions = await this.terminationRepository.find({
      where: { agreementId: agreement.id },
      order: { position: 'ASC' },
    });

    return {
      ...this.toSummary(agreement),
      canvas: {
        milestones: milestones.map((m) => ({
          id: m.id,
          offsetMonths: m.offsetMonths,
          label: m.label,
          items: items
            .filter((i) => i.milestoneId === m.id)
            .map((i) => ({
              id: i.id,
              track: i.track,
              description: i.description,
              amount: i.amount,
            })),
        })),
        costEntries: costEntries.map((c) => ({
          id: c.id,
          category: c.category,
          label: c.label,
          amount: c.amount,
          headcount: c.headcount,
        })),
        investmentEntries: investmentEntries.map((v) => ({
          id: v.id,
          kind: v.kind,
          label: v.label,
          amount: v.amount,
        })),
        terminationConditions: terminationConditions.map((t) => ({
          id: t.id,
          position: t.position,
          text: t.text,
        })),
      },
      citedTerminationConditionId: agreement.citedTerminationConditionId,
      terminationNote: agreement.terminationNote,
    };
  }
}
