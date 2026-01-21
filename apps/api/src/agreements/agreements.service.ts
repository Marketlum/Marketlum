import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, IsNull, Not, In, SelectQueryBuilder } from 'typeorm';
import { Agreement, AgreementCategory, AgreementGateway } from './entities/agreement.entity';
import { AgreementParty, AgreementPartyRole } from './entities/agreement-party.entity';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { AddPartyDto } from './dto/add-party.dto';
import { Agent, AgentType } from '../agents/entities/agent.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

interface ListFilters {
  q?: string;
  category?: AgreementCategory;
  status?: 'open' | 'completed';
  gateway?: AgreementGateway;
  agentId?: string;
  sort?: string;
}

interface StatsFilters {
  category?: AgreementCategory;
  agentId?: string;
}

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
    @InjectRepository(AgreementParty)
    private readonly partyRepository: Repository<AgreementParty>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
  ) {}

  private get treeRepository(): TreeRepository<Agreement> {
    return this.agreementRepository.manager.getTreeRepository(Agreement);
  }

  async create(createDto: CreateAgreementDto): Promise<Agreement> {
    const { parties, parentId, fileId, completedAt, ...data } = createDto;

    const agreement = this.agreementRepository.create({
      ...data,
      completedAt: completedAt ? new Date(completedAt) : null,
    });

    // Set parent if provided
    if (parentId) {
      const parent = await this.agreementRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException(`Parent agreement with ID ${parentId} not found`);
      }
      agreement.parent = parent;
      agreement.parentId = parentId;
    }

    // Set file if provided
    if (fileId) {
      const file = await this.fileRepository.findOne({ where: { id: fileId } });
      if (!file) {
        throw new NotFoundException(`File with ID ${fileId} not found`);
      }
      agreement.file = file;
      agreement.fileId = fileId;
    }

    const savedAgreement = await this.agreementRepository.save(agreement);

    // Add parties if provided
    if (parties && parties.length > 0) {
      for (const partyInput of parties) {
        const agent = await this.agentRepository.findOne({ where: { id: partyInput.agentId } });
        if (!agent) {
          throw new NotFoundException(`Agent with ID ${partyInput.agentId} not found`);
        }
        const party = this.partyRepository.create({
          agreement: savedAgreement,
          agreementId: savedAgreement.id,
          agent,
          agentId: partyInput.agentId,
          role: partyInput.role,
        });
        await this.partyRepository.save(party);
      }
    }

    return this.findOne(savedAgreement.id);
  }

  async findAll(filters: ListFilters, options: IPaginationOptions): Promise<Pagination<Agreement>> {
    const queryBuilder = this.agreementRepository
      .createQueryBuilder('agreement')
      .leftJoinAndSelect('agreement.file', 'file')
      .leftJoinAndSelect('agreement.parties', 'parties')
      .leftJoinAndSelect('parties.agent', 'agent');

    // Apply filters
    if (filters.q) {
      queryBuilder.andWhere(
        '(agreement.title ILIKE :q OR agreement.content ILIKE :q)',
        { q: `%${filters.q}%` }
      );
    }

    if (filters.category) {
      queryBuilder.andWhere('agreement.category = :category', { category: filters.category });
    }

    if (filters.status === 'open') {
      queryBuilder.andWhere('agreement.completedAt IS NULL');
    } else if (filters.status === 'completed') {
      queryBuilder.andWhere('agreement.completedAt IS NOT NULL');
    }

    if (filters.gateway) {
      queryBuilder.andWhere('agreement.gateway = :gateway', { gateway: filters.gateway });
    }

    if (filters.agentId) {
      queryBuilder.andWhere(
        'agreement.id IN (SELECT "agreementId" FROM agreement_party WHERE "agentId" = :agentId)',
        { agentId: filters.agentId }
      );
    }

    // Apply sorting
    this.applySorting(queryBuilder, filters.sort);

    return paginate<Agreement>(queryBuilder, options);
  }

  private applySorting(queryBuilder: SelectQueryBuilder<Agreement>, sort?: string) {
    if (sort) {
      const [field, order] = sort.split('_');
      const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      switch (field) {
        case 'title':
          queryBuilder.orderBy('agreement.title', orderDirection);
          break;
        case 'updatedAt':
          queryBuilder.orderBy('agreement.updatedAt', orderDirection);
          break;
        case 'completedAt':
          queryBuilder.orderBy('agreement.completedAt', orderDirection, 'NULLS LAST');
          break;
        case 'createdAt':
          queryBuilder.orderBy('agreement.createdAt', orderDirection);
          break;
        default:
          this.applyDefaultSorting(queryBuilder);
      }
    } else {
      this.applyDefaultSorting(queryBuilder);
    }
  }

  private applyDefaultSorting(queryBuilder: SelectQueryBuilder<Agreement>) {
    // Open first (completedAt IS NULL), then by updatedAt desc
    queryBuilder
      .orderBy('CASE WHEN agreement.completedAt IS NULL THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('agreement.updatedAt', 'DESC');
  }

  async findTree(): Promise<Agreement[]> {
    const trees = await this.treeRepository.findTrees({
      relations: ['file', 'parties', 'parties.agent'],
    });
    return trees;
  }

  async findOne(id: string): Promise<Agreement> {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['file', 'parties', 'parties.agent', 'children', 'parent'],
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement with ID ${id} not found`);
    }

    return agreement;
  }

  async update(id: string, updateDto: UpdateAgreementDto): Promise<Agreement> {
    const agreement = await this.findOne(id);
    const { parties, parentId, fileId, completedAt, ...data } = updateDto;

    // Update basic fields
    Object.assign(agreement, data);

    // Handle completedAt
    if (completedAt !== undefined) {
      agreement.completedAt = completedAt ? new Date(completedAt) : null;
    }

    // Handle parent change
    if (parentId !== undefined) {
      if (parentId === null) {
        agreement.parent = null;
        agreement.parentId = null;
      } else if (parentId !== agreement.parentId) {
        // Validate not setting to self
        if (parentId === id) {
          throw new BadRequestException('Agreement cannot be its own parent');
        }

        // Validate not setting to descendant
        const descendants = await this.treeRepository.findDescendants(agreement);
        if (descendants.some(d => d.id === parentId)) {
          throw new BadRequestException('Cannot set parent to a descendant (would create cycle)');
        }

        const parent = await this.agreementRepository.findOne({ where: { id: parentId } });
        if (!parent) {
          throw new NotFoundException(`Parent agreement with ID ${parentId} not found`);
        }
        agreement.parent = parent;
        agreement.parentId = parentId;
      }
    }

    // Handle file change
    if (fileId !== undefined) {
      if (fileId === null) {
        agreement.file = null;
        agreement.fileId = null;
      } else if (fileId !== agreement.fileId) {
        const file = await this.fileRepository.findOne({ where: { id: fileId } });
        if (!file) {
          throw new NotFoundException(`File with ID ${fileId} not found`);
        }
        agreement.file = file;
        agreement.fileId = fileId;
      }
    }

    await this.agreementRepository.save(agreement);

    // Handle parties update if provided
    if (parties !== undefined) {
      // Remove existing parties
      await this.partyRepository.delete({ agreementId: id });

      // Add new parties
      for (const partyInput of parties) {
        const agent = await this.agentRepository.findOne({ where: { id: partyInput.agentId } });
        if (!agent) {
          throw new NotFoundException(`Agent with ID ${partyInput.agentId} not found`);
        }
        const party = this.partyRepository.create({
          agreement,
          agreementId: id,
          agent,
          agentId: partyInput.agentId,
          role: partyInput.role,
        });
        await this.partyRepository.save(party);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement with ID ${id} not found`);
    }

    // Check for children
    const children = await this.treeRepository.findDescendants(agreement);
    if (children.length > 1) { // includes self
      throw new ConflictException('Cannot delete an agreement that has annexes/children. Delete annexes first.');
    }

    await this.agreementRepository.remove(agreement);
  }

  async addParty(agreementId: string, addPartyDto: AddPartyDto): Promise<AgreementParty> {
    const agreement = await this.findOne(agreementId);
    const agent = await this.agentRepository.findOne({ where: { id: addPartyDto.agentId } });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${addPartyDto.agentId} not found`);
    }

    // Check if party already exists
    const existing = await this.partyRepository.findOne({
      where: { agreementId, agentId: addPartyDto.agentId },
    });

    if (existing) {
      throw new ConflictException('Agent is already a party to this agreement');
    }

    const party = this.partyRepository.create({
      agreement,
      agreementId,
      agent,
      agentId: addPartyDto.agentId,
      role: addPartyDto.role,
    });

    return this.partyRepository.save(party);
  }

  async removeParty(agreementId: string, agentId: string): Promise<void> {
    const party = await this.partyRepository.findOne({
      where: { agreementId, agentId },
    });

    if (!party) {
      throw new NotFoundException('Party not found');
    }

    await this.partyRepository.remove(party);
  }

  async getStats(filters: StatsFilters): Promise<{ openCount: number; completedCount: number; totalCount: number }> {
    let queryBuilder = this.agreementRepository.createQueryBuilder('agreement');

    if (filters.category) {
      queryBuilder = queryBuilder.andWhere('agreement.category = :category', { category: filters.category });
    }

    if (filters.agentId) {
      queryBuilder = queryBuilder.andWhere(
        'agreement.id IN (SELECT "agreementId" FROM agreement_party WHERE "agentId" = :agentId)',
        { agentId: filters.agentId }
      );
    }

    const [openCount, completedCount] = await Promise.all([
      queryBuilder.clone().andWhere('agreement.completedAt IS NULL').getCount(),
      queryBuilder.clone().andWhere('agreement.completedAt IS NOT NULL').getCount(),
    ]);

    return {
      openCount,
      completedCount,
      totalCount: openCount + completedCount,
    };
  }

  async seed(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    // First, ensure agents exist
    const agentsSeed = [
      { name: 'Marketlum Sp. z o.o.', type: AgentType.ORGANIZATION },
      { name: 'Acme Corp', type: AgentType.ORGANIZATION },
      { name: 'Globex Inc.', type: AgentType.ORGANIZATION },
      { name: 'Jane Doe', type: AgentType.INDIVIDUAL },
      { name: 'John Smith', type: AgentType.INDIVIDUAL },
    ];

    const agents: Record<string, Agent> = {};

    for (const agentData of agentsSeed) {
      let agent = await this.agentRepository.findOne({ where: { name: agentData.name } });
      if (!agent) {
        agent = this.agentRepository.create(agentData);
        agent = await this.agentRepository.save(agent);
      }
      agents[agentData.name] = agent;
    }

    // Seed agreements
    const agreementsSeed = [
      {
        title: 'Master Service Agreement — Acme Corp',
        category: AgreementCategory.EXTERNAL_MARKET,
        gateway: AgreementGateway.DOCU_SIGN,
        completedAt: null,
        parties: [
          { name: 'Marketlum Sp. z o.o.', role: AgreementPartyRole.SERVICE_PROVIDER },
          { name: 'Acme Corp', role: AgreementPartyRole.CLIENT },
        ],
        children: [
          {
            title: 'Annex A — Scope of Work',
            category: AgreementCategory.EXTERNAL_MARKET,
            gateway: AgreementGateway.DOCU_SIGN,
            completedAt: null,
            parties: [] as { name: string; role: AgreementPartyRole }[],
            children: [],
          },
          {
            title: 'Annex B — Pricing',
            category: AgreementCategory.EXTERNAL_MARKET,
            gateway: AgreementGateway.DOCU_SIGN,
            completedAt: null,
            parties: [] as { name: string; role: AgreementPartyRole }[],
            children: [],
          },
        ],
      },
      {
        title: 'Employment Agreement — Jane Doe',
        category: AgreementCategory.INTERNAL_MARKET,
        gateway: AgreementGateway.PEN_AND_PAPER,
        completedAt: new Date('2024-01-15'),
        parties: [
          { name: 'Marketlum Sp. z o.o.', role: AgreementPartyRole.EMPLOYER },
          { name: 'Jane Doe', role: AgreementPartyRole.EMPLOYEE },
        ],
        children: [],
      },
      {
        title: 'NDA — Globex Inc.',
        category: AgreementCategory.EXTERNAL_MARKET,
        gateway: AgreementGateway.NOTARY,
        completedAt: null,
        parties: [
          { name: 'Marketlum Sp. z o.o.', role: AgreementPartyRole.PARTNER },
          { name: 'Globex Inc.', role: AgreementPartyRole.PARTNER },
        ],
        children: [],
      },
      {
        title: 'Internal Value Stream Agreement — Product Team',
        category: AgreementCategory.INTERNAL_MARKET,
        gateway: AgreementGateway.OTHER,
        completedAt: null,
        parties: [
          { name: 'Marketlum Sp. z o.o.', role: AgreementPartyRole.EMPLOYER },
          { name: 'John Smith', role: AgreementPartyRole.EMPLOYEE },
        ],
        children: [],
      },
    ];

    const createAgreement = async (
      data: typeof agreementsSeed[0],
      parent?: Agreement
    ): Promise<void> => {
      // Check if agreement already exists (by title + category + parentId combination)
      const existingQuery: any = {
        title: data.title,
        category: data.category,
      };
      if (parent) {
        existingQuery.parentId = parent.id;
      } else {
        existingQuery.parentId = IsNull();
      }

      const existing = await this.agreementRepository.findOne({ where: existingQuery });

      let agreement: Agreement;
      if (existing) {
        skipped++;
        agreement = existing;
      } else {
        agreement = this.agreementRepository.create({
          title: data.title,
          category: data.category,
          gateway: data.gateway,
          completedAt: data.completedAt,
        });

        if (parent) {
          agreement.parent = parent;
          agreement.parentId = parent.id;
        }

        agreement = await this.agreementRepository.save(agreement);
        inserted++;

        // Add parties
        for (const partyData of data.parties) {
          const agent = agents[partyData.name];
          if (agent) {
            const party = this.partyRepository.create({
              agreement,
              agreementId: agreement.id,
              agent,
              agentId: agent.id,
              role: partyData.role,
            });
            await this.partyRepository.save(party);
          }
        }
      }

      // Process children
      if (data.children) {
        for (const child of data.children) {
          await createAgreement(child as typeof agreementsSeed[0], agreement);
        }
      }
    };

    for (const agreementData of agreementsSeed) {
      await createAgreement(agreementData);
    }

    return { inserted, skipped };
  }
}
