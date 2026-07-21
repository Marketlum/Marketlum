import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Agreement, Value, ValueStream } from '@marketlum/core';
import { RdhyPlatform } from '../platforms/rdhy-platform.entity';
import { RdhyEmcAgreement } from './rdhy-emc-agreement.entity';
import { RdhyEmcNode } from './rdhy-emc-node.entity';
import { RdhyEmcExposedService } from './rdhy-emc-exposed-service.entity';
import { RdhyEmcLeadingGoal } from './rdhy-emc-leading-goal.entity';
import { RdhyEmcCostEntry } from './rdhy-emc-cost-entry.entity';
import { RdhyEmcTerminationCondition } from './rdhy-emc-termination-condition.entity';
import type {
  CreateEmcAgreementInput,
  EmcCanvasInput,
  RdhyEmcAgreementDocument,
  RdhyEmcAgreementSummary,
  TerminateEmcAgreementInput,
  UpdateEmcAgreementInput,
} from '../shared/emc-schemas';

@Injectable()
export class EmcAgreementsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RdhyEmcAgreement)
    private readonly agreementRepository: Repository<RdhyEmcAgreement>,
    @InjectRepository(RdhyEmcNode)
    private readonly nodeRepository: Repository<RdhyEmcNode>,
    @InjectRepository(RdhyEmcExposedService)
    private readonly serviceRepository: Repository<RdhyEmcExposedService>,
    @InjectRepository(RdhyEmcLeadingGoal)
    private readonly goalRepository: Repository<RdhyEmcLeadingGoal>,
    @InjectRepository(RdhyEmcCostEntry)
    private readonly costRepository: Repository<RdhyEmcCostEntry>,
    @InjectRepository(RdhyEmcTerminationCondition)
    private readonly terminationRepository: Repository<RdhyEmcTerminationCondition>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(RdhyPlatform)
    private readonly platformRepository: Repository<RdhyPlatform>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(Agreement)
    private readonly coreAgreementRepository: Repository<Agreement>,
  ) {}

  async create(input: CreateEmcAgreementInput): Promise<RdhyEmcAgreementSummary> {
    await this.validateReferences(input);
    const saved = await this.agreementRepository.save(
      this.agreementRepository.create({
        title: input.title,
        platformId: input.platformId,
        collaborativeScenario: input.collaborativeScenario ?? null,
        collaborativeGoals: input.collaborativeGoals ?? null,
        governanceModel: input.governanceModel ?? null,
        reinvestmentPercent:
          input.reinvestmentPercent != null ? String(input.reinvestmentPercent) : null,
        investmentNote: input.investmentNote ?? null,
        currencyId: input.currencyId ?? null,
        agreementId: input.agreementId ?? null,
        status: 'DRAFT',
      }),
    );
    return this.toSummary(await this.reload(saved.id));
  }

  async findAll(): Promise<RdhyEmcAgreementSummary[]> {
    const agreements = await this.agreementRepository.find({
      relations: ['platform', 'currency'],
      order: { updatedAt: 'DESC' },
    });
    return agreements.map((a) => this.toSummary(a));
  }

  async countByPlatform(platformId: string): Promise<number> {
    return this.agreementRepository.count({ where: { platformId } });
  }

  async findOne(id: string): Promise<RdhyEmcAgreementDocument> {
    const agreement = await this.reload(id);
    return this.toDocument(agreement);
  }

  async updateSetting(
    id: string,
    input: UpdateEmcAgreementInput,
  ): Promise<RdhyEmcAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft EMC agreements can be updated');
    await this.validateReferences(input);
    if (input.title !== undefined) agreement.title = input.title;
    if (input.platformId !== undefined) agreement.platformId = input.platformId;
    if (input.collaborativeScenario !== undefined) {
      agreement.collaborativeScenario = input.collaborativeScenario ?? null;
    }
    if (input.collaborativeGoals !== undefined) {
      agreement.collaborativeGoals = input.collaborativeGoals ?? null;
    }
    if (input.governanceModel !== undefined) {
      agreement.governanceModel = input.governanceModel ?? null;
    }
    if (input.reinvestmentPercent !== undefined) {
      agreement.reinvestmentPercent =
        input.reinvestmentPercent != null ? String(input.reinvestmentPercent) : null;
      await this.requireSharePoolFits(agreement);
    }
    if (input.investmentNote !== undefined) agreement.investmentNote = input.investmentNote ?? null;
    if (input.currencyId !== undefined) agreement.currencyId = input.currencyId ?? null;
    if (input.agreementId !== undefined) agreement.agreementId = input.agreementId ?? null;
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async replaceCanvas(id: string, canvas: EmcCanvasInput): Promise<RdhyEmcAgreementDocument> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft EMC agreements can have their canvas edited');

    const valueStreamIds = canvas.nodes.map((n) => n.valueStreamId);
    if (new Set(valueStreamIds).size !== valueStreamIds.length) {
      throw new BadRequestException('Each value stream can appear as a micro-node only once');
    }
    if (canvas.nodes.length > 0) {
      const leading = canvas.nodes.filter((n) => n.isLeading);
      if (leading.length !== 1) {
        throw new BadRequestException('Exactly one micro-node must be the leading node');
      }
      if (leading[0].tier !== 'STRATEGIC') {
        throw new BadRequestException('The leading micro-node must be strategic');
      }
    }
    const sharingTactical = canvas.nodes.find(
      (n) => n.tier === 'TACTICAL' && n.profitSharePercent != null,
    );
    if (sharingTactical) {
      throw new BadRequestException('Tactical micro-nodes participate without value sharing');
    }
    const shareSum = canvas.nodes.reduce((sum, n) => sum + (n.profitSharePercent ?? 0), 0);
    const reinvestment = agreement.reinvestmentPercent
      ? Number(agreement.reinvestmentPercent)
      : 0;
    if (shareSum + reinvestment > 100) {
      throw new BadRequestException(
        `Profit shares (${shareSum}%) plus the reinvestment share (${reinvestment}%) exceed 100%`,
      );
    }
    if (valueStreamIds.length > 0) {
      const found = await this.valueStreamRepository.find({ where: { id: In(valueStreamIds) } });
      if (found.length !== valueStreamIds.length) {
        throw new NotFoundException('Value stream not found');
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // Services, goals and cost entries cascade from nodes at the DB level.
      await manager.delete(RdhyEmcNode, { agreementId: id });
      await manager.delete(RdhyEmcTerminationCondition, { agreementId: id });

      for (const [ni, node] of canvas.nodes.entries()) {
        const savedNode = await manager.save(
          manager.create(RdhyEmcNode, {
            agreementId: id,
            valueStreamId: node.valueStreamId,
            tier: node.tier,
            isLeading: node.isLeading,
            profitSharePercent:
              node.profitSharePercent != null ? String(node.profitSharePercent) : null,
            position: ni,
          }),
        );
        for (const [si, text] of node.services.entries()) {
          await manager.save(
            manager.create(RdhyEmcExposedService, { nodeId: savedNode.id, position: si, text }),
          );
        }
        for (const [gi, text] of node.goals.entries()) {
          await manager.save(
            manager.create(RdhyEmcLeadingGoal, { nodeId: savedNode.id, position: gi, text }),
          );
        }
        for (const [ci, cost] of node.costEntries.entries()) {
          await manager.save(
            manager.create(RdhyEmcCostEntry, {
              nodeId: savedNode.id,
              label: cost.label,
              amount: String(cost.amount),
              headcount: cost.headcount ?? null,
              position: ci,
            }),
          );
        }
      }
      for (const [ti, text] of canvas.terminationConditions.entries()) {
        await manager.save(
          manager.create(RdhyEmcTerminationCondition, { agreementId: id, position: ti, text }),
        );
      }
      // Bump updatedAt so list ordering reflects canvas edits.
      await manager.update(RdhyEmcAgreement, id, { updatedAt: new Date() });
    });

    return this.findOne(id);
  }

  async activate(id: string): Promise<RdhyEmcAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'DRAFT', 'Only draft EMC agreements can be activated');
    // Unlike VAM, no exclusivity: a value stream may participate in several
    // active EMCs at once.
    agreement.status = 'ACTIVE';
    agreement.startedAt = new Date();
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async complete(id: string): Promise<RdhyEmcAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'ACTIVE', 'Only active EMC agreements can be completed');
    agreement.status = 'COMPLETED';
    agreement.endedAt = new Date();
    await this.agreementRepository.save(agreement);
    return this.toSummary(await this.reload(id));
  }

  async terminate(
    id: string,
    input: TerminateEmcAgreementInput,
  ): Promise<RdhyEmcAgreementSummary> {
    const agreement = await this.requireAgreement(id);
    this.requireStatus(agreement, 'ACTIVE', 'Only active EMC agreements can be terminated');

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
    this.requireStatus(agreement, 'DRAFT', 'Only draft EMC agreements can be deleted');
    await this.agreementRepository.remove(agreement);
  }

  private async requireSharePoolFits(agreement: RdhyEmcAgreement): Promise<void> {
    const nodes = await this.nodeRepository.find({ where: { agreementId: agreement.id } });
    const shareSum = nodes.reduce(
      (sum, n) => sum + (n.profitSharePercent ? Number(n.profitSharePercent) : 0),
      0,
    );
    const reinvestment = agreement.reinvestmentPercent
      ? Number(agreement.reinvestmentPercent)
      : 0;
    if (shareSum + reinvestment > 100) {
      throw new BadRequestException(
        `Profit shares (${shareSum}%) plus the reinvestment share (${reinvestment}%) exceed 100%`,
      );
    }
  }

  private async validateReferences(
    input: Partial<CreateEmcAgreementInput>,
  ): Promise<void> {
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

  private async requireAgreement(id: string): Promise<RdhyEmcAgreement> {
    const agreement = await this.agreementRepository.findOne({ where: { id } });
    if (!agreement) throw new NotFoundException('EMC agreement not found');
    return agreement;
  }

  private requireStatus(
    agreement: RdhyEmcAgreement,
    status: RdhyEmcAgreement['status'],
    message: string,
  ): void {
    if (agreement.status !== status) throw new ConflictException(message);
  }

  private async reload(id: string): Promise<RdhyEmcAgreement> {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['platform', 'currency'],
    });
    if (!agreement) throw new NotFoundException('EMC agreement not found');
    return agreement;
  }

  private toSummary(agreement: RdhyEmcAgreement): RdhyEmcAgreementSummary {
    return {
      id: agreement.id,
      title: agreement.title,
      status: agreement.status,
      collaborativeScenario: agreement.collaborativeScenario,
      collaborativeGoals: agreement.collaborativeGoals,
      governanceModel: agreement.governanceModel,
      reinvestmentPercent: agreement.reinvestmentPercent,
      investmentNote: agreement.investmentNote,
      startedAt: agreement.startedAt ? agreement.startedAt.toISOString() : null,
      endedAt: agreement.endedAt ? agreement.endedAt.toISOString() : null,
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

  private async toDocument(agreement: RdhyEmcAgreement): Promise<RdhyEmcAgreementDocument> {
    const nodes = await this.nodeRepository.find({
      where: { agreementId: agreement.id },
      relations: ['valueStream'],
      order: { position: 'ASC' },
    });
    const nodeIds = nodes.map((n) => n.id);
    const [services, goals, costEntries] = nodeIds.length
      ? await Promise.all([
          this.serviceRepository.find({
            where: { nodeId: In(nodeIds) },
            order: { position: 'ASC' },
          }),
          this.goalRepository.find({ where: { nodeId: In(nodeIds) }, order: { position: 'ASC' } }),
          this.costRepository.find({ where: { nodeId: In(nodeIds) }, order: { position: 'ASC' } }),
        ])
      : [[], [], []];
    const terminationConditions = await this.terminationRepository.find({
      where: { agreementId: agreement.id },
      order: { position: 'ASC' },
    });

    return {
      ...this.toSummary(agreement),
      canvas: {
        nodes: nodes.map((n) => ({
          id: n.id,
          valueStream: {
            id: n.valueStream.id,
            code: n.valueStream.code,
            name: n.valueStream.name,
          },
          tier: n.tier,
          isLeading: n.isLeading,
          profitSharePercent: n.profitSharePercent,
          services: services
            .filter((s) => s.nodeId === n.id)
            .map((s) => ({ id: s.id, position: s.position, text: s.text })),
          goals: goals
            .filter((g) => g.nodeId === n.id)
            .map((g) => ({ id: g.id, position: g.position, text: g.text })),
          costEntries: costEntries
            .filter((c) => c.nodeId === n.id)
            .map((c) => ({ id: c.id, label: c.label, amount: c.amount, headcount: c.headcount })),
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
