import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, In, IsNull } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { Address } from './addresses/entities/address.entity';
import { AddressesService } from './addresses/addresses.service';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Value } from '../values/entities/value.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import {
  CreateAgentInput,
  UpdateAgentInput,
  MoveAgentInput,
  PaginationQuery,
  AgentType,
  ValueType,
} from '@marketlum/shared';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepository: TreeRepository<Agent>,
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: Repository<Taxonomy>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly addressesService: AddressesService,
  ) {}

  async create(input: CreateAgentInput): Promise<Agent> {
    const { mainTaxonomyId, taxonomyIds, imageId, functionalCurrencyId, parentId, ...rest } =
      input;

    const agent = this.agentsRepository.create(rest);

    if (parentId) {
      const parent = await this.agentsRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException('Parent agent not found');
      }
      agent.parent = parent;
      // TypeORM does not maintain level — this service does.
      agent.level = parent.level + 1;
    } else {
      agent.parent = null;
      agent.level = 0;
    }

    if (functionalCurrencyId !== undefined && functionalCurrencyId !== null) {
      await this.assertCurrencyValue(functionalCurrencyId);
      agent.functionalCurrencyId = functionalCurrencyId;
    } else {
      agent.functionalCurrencyId = null;
    }

    if (imageId) {
      const file = await this.fileRepository.findOne({ where: { id: imageId } });
      if (!file) {
        throw new NotFoundException('Image file not found');
      }
      agent.imageId = imageId;
      agent.image = file;
    }

    if (mainTaxonomyId) {
      const taxonomy = await this.taxonomyRepository.findOne({
        where: { id: mainTaxonomyId },
      });
      if (!taxonomy) {
        throw new NotFoundException('Main taxonomy not found');
      }
      agent.mainTaxonomyId = mainTaxonomyId;
      agent.mainTaxonomy = taxonomy;
    }

    if (taxonomyIds && taxonomyIds.length > 0) {
      const taxonomies = await this.taxonomyRepository.find({
        where: { id: In(taxonomyIds) },
      });
      if (taxonomies.length !== taxonomyIds.length) {
        throw new NotFoundException('One or more taxonomies not found');
      }
      agent.taxonomies = taxonomies;
    } else {
      agent.taxonomies = [];
    }

    const saved = await this.agentsRepository.save(agent);
    return this.findOne(saved.id);
  }

  async findAll(query: PaginationQuery & { type?: AgentType; taxonomyId?: string }) {
    const { page, limit, search, sortBy, sortOrder, type, taxonomyId } = query;
    const skip = (page - 1) * limit;

    const qb = this.agentsRepository.createQueryBuilder('agent');

    qb.leftJoinAndSelect('agent.mainTaxonomy', 'mainTaxonomy');
    qb.leftJoinAndSelect('agent.taxonomies', 'taxonomies');
    qb.leftJoinAndSelect('agent.image', 'image');
    qb.leftJoinAndSelect('agent.addresses', 'addresses');
    qb.leftJoinAndSelect('addresses.country', 'addressCountry');
    qb.leftJoinAndSelect('agent.functionalCurrency', 'functionalCurrency');
    qb.leftJoinAndSelect('agent.parent', 'parent');

    if (type) {
      qb.andWhere('agent.type = :type', { type });
    }

    if (taxonomyId) {
      qb.andWhere(
        '(agent."mainTaxonomyId" = :taxonomyId OR EXISTS (SELECT 1 FROM agent_taxonomies at WHERE at."agentId" = agent.id AND at."taxonomyId" = :taxonomyId))',
        { taxonomyId },
      );
    }

    if (search) {
      qb.andWhere(
        '(agent.name ILIKE :search OR agent.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`agent.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('agent.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    for (const agent of data) {
      agent.addresses = this.addressesService.sortAddresses(agent.addresses ?? []);
    }

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

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({
      where: { id },
      relations: [
        'mainTaxonomy',
        'taxonomies',
        'image',
        'addresses',
        'addresses.country',
        'functionalCurrency',
        'parent',
      ],
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    agent.addresses = this.addressesService.sortAddresses(agent.addresses ?? []);
    const ancestorsWithSelf = await this.agentsRepository.findAncestors(agent);
    agent.ancestors = ancestorsWithSelf
      .filter((a) => a.id !== agent.id)
      .sort((a, b) => a.level - b.level);
    return agent;
  }

  async findTree(): Promise<Agent[]> {
    const trees = await this.agentsRepository.findTrees({ relations: ['image'] });
    const sortByName = (nodes: Agent[]): Agent[] => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      for (const node of nodes) {
        if (node.children?.length) sortByName(node.children);
      }
      return nodes;
    };
    return sortByName(trees);
  }

  async findRoots(): Promise<Agent[]> {
    return this.agentsRepository.find({
      where: { parentId: IsNull() },
      relations: ['mainTaxonomy', 'image', 'parent'],
      order: { name: 'ASC' },
    });
  }

  async findChildren(id: string): Promise<Agent[]> {
    await this.requireAgent(id);
    return this.agentsRepository.find({
      where: { parentId: id },
      relations: ['mainTaxonomy', 'image', 'parent'],
      order: { name: 'ASC' },
    });
  }

  async findDescendants(id: string): Promise<Agent[]> {
    const agent = await this.requireAgent(id);
    const withSelf = await this.agentsRepository.findDescendants(agent, {
      relations: ['image', 'parent'],
    });
    return withSelf
      .filter((a) => a.id !== id)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }

  async move(id: string, input: MoveAgentInput): Promise<Agent> {
    const agent = await this.requireAgent(id);

    let newParent: Agent | null = null;
    let newLevel = 0;
    if (input.parentId !== null) {
      if (input.parentId === id) {
        throw new BadRequestException('Cannot move an agent under itself');
      }
      newParent = await this.agentsRepository.findOne({ where: { id: input.parentId } });
      if (!newParent) {
        throw new NotFoundException('Parent agent not found');
      }
      const subtree = await this.agentsRepository.findDescendants(agent);
      if (subtree.some((d) => d.id === input.parentId)) {
        throw new BadRequestException('Cannot move an agent under its own descendant');
      }
      newLevel = newParent.level + 1;
    }

    const delta = newLevel - agent.level;
    agent.parent = newParent;
    agent.level = newLevel;
    await this.agentsRepository.save(agent);

    // Shift descendant levels by the same delta (subtree membership is
    // unchanged by the move, so the closure table addresses them correctly).
    if (delta !== 0) {
      await this.agentsRepository.query(
        `UPDATE "agents" SET "level" = "level" + $1
         WHERE "id" IN (
           SELECT "id_descendant" FROM "agents_closure"
           WHERE "id_ancestor" = $2 AND "id_descendant" <> $2
         )`,
        [delta, id],
      );
    }

    return this.findOne(id);
  }

  private async requireAgent(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    const agent = await this.findOne(id);
    const { mainTaxonomyId, taxonomyIds, imageId, functionalCurrencyId, ...rest } = input;

    Object.assign(agent, rest);

    if (functionalCurrencyId !== undefined) {
      if (functionalCurrencyId === null) {
        agent.functionalCurrency = null;
        agent.functionalCurrencyId = null;
      } else {
        await this.assertCurrencyValue(functionalCurrencyId);
        agent.functionalCurrency = null;
        agent.functionalCurrencyId = functionalCurrencyId;
      }
    }

    if (imageId !== undefined) {
      if (imageId === null) {
        agent.image = null;
        agent.imageId = null;
      } else {
        const file = await this.fileRepository.findOne({ where: { id: imageId } });
        if (!file) {
          throw new NotFoundException('Image file not found');
        }
        agent.imageId = imageId;
        agent.image = file;
      }
    }

    if (mainTaxonomyId !== undefined) {
      if (mainTaxonomyId === null) {
        agent.mainTaxonomy = null;
        agent.mainTaxonomyId = null;
      } else {
        const taxonomy = await this.taxonomyRepository.findOne({
          where: { id: mainTaxonomyId },
        });
        if (!taxonomy) {
          throw new NotFoundException('Main taxonomy not found');
        }
        agent.mainTaxonomyId = mainTaxonomyId;
        agent.mainTaxonomy = taxonomy;
      }
    }

    if (taxonomyIds !== undefined) {
      if (taxonomyIds.length === 0) {
        agent.taxonomies = [];
      } else {
        const taxonomies = await this.taxonomyRepository.find({
          where: { id: In(taxonomyIds) },
        });
        if (taxonomies.length !== taxonomyIds.length) {
          throw new NotFoundException('One or more taxonomies not found');
        }
        agent.taxonomies = taxonomies;
      }
    }

    await this.agentsRepository.save(agent);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    const childCount = await this.agentsRepository.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException(
        'Agent has sub-agents. Move or delete them before deleting this agent.',
      );
    }
    await this.agentsRepository.remove(agent);
  }

  async getSnapshotReferences(id: string): Promise<{ invoiceItems: number }> {
    const agent = await this.agentsRepository.findOne({ where: { id } });
    if (!agent) throw new NotFoundException('Agent not found');

    const invoiceItems = await this.invoiceItemRepository.query(
      `SELECT COUNT(*) AS count FROM invoice_items ii
       JOIN invoices i ON i.id = ii."invoiceId"
       WHERE (i."fromAgentId" = $1 AND ii."fromAgentAmount" IS NOT NULL)
          OR (i."toAgentId"   = $1 AND ii."toAgentAmount"   IS NOT NULL)`,
      [id],
    );

    return { invoiceItems: Number(invoiceItems[0]?.count ?? 0) };
  }

  private async assertCurrencyValue(valueId: string): Promise<void> {
    const value = await this.valueRepository.findOne({ where: { id: valueId } });
    if (!value) throw new NotFoundException('Functional currency value not found');
    if (value.type !== ValueType.CURRENCY) {
      throw new BadRequestException('Functional currency must reference a Value with type=currency');
    }
  }
}
