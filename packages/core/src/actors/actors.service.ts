import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, In, IsNull } from 'typeorm';
import { Actor } from './entities/actor.entity';
import { Address } from './addresses/entities/address.entity';
import { AddressesService } from './addresses/addresses.service';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Value } from '../values/entities/value.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import {
  CreateActorInput,
  UpdateActorInput,
  MoveActorInput,
  PaginationQuery,
  ActorType,
  ValueType,
} from '@marketlum/shared';

@Injectable()
export class ActorsService {
  constructor(
    @InjectRepository(Actor)
    private readonly actorsRepository: TreeRepository<Actor>,
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

  async create(input: CreateActorInput): Promise<Actor> {
    const { mainTaxonomyId, taxonomyIds, imageId, functionalCurrencyId, parentId, ...rest } =
      input;

    const actor = this.actorsRepository.create(rest);

    if (parentId) {
      const parent = await this.actorsRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException('Parent actor not found');
      }
      actor.parent = parent;
      // TypeORM does not maintain level — this service does.
      actor.level = parent.level + 1;
    } else {
      actor.parent = null;
      actor.level = 0;
    }

    if (functionalCurrencyId !== undefined && functionalCurrencyId !== null) {
      await this.assertCurrencyValue(functionalCurrencyId);
      actor.functionalCurrencyId = functionalCurrencyId;
    } else {
      actor.functionalCurrencyId = null;
    }

    if (imageId) {
      const file = await this.fileRepository.findOne({ where: { id: imageId } });
      if (!file) {
        throw new NotFoundException('Image file not found');
      }
      actor.imageId = imageId;
      actor.image = file;
    }

    if (mainTaxonomyId) {
      const taxonomy = await this.taxonomyRepository.findOne({
        where: { id: mainTaxonomyId },
      });
      if (!taxonomy) {
        throw new NotFoundException('Main taxonomy not found');
      }
      actor.mainTaxonomyId = mainTaxonomyId;
      actor.mainTaxonomy = taxonomy;
    }

    if (taxonomyIds && taxonomyIds.length > 0) {
      const taxonomies = await this.taxonomyRepository.find({
        where: { id: In(taxonomyIds) },
      });
      if (taxonomies.length !== taxonomyIds.length) {
        throw new NotFoundException('One or more taxonomies not found');
      }
      actor.taxonomies = taxonomies;
    } else {
      actor.taxonomies = [];
    }

    const saved = await this.actorsRepository.save(actor);
    return this.findOne(saved.id);
  }

  async findAll(query: PaginationQuery & { type?: ActorType; taxonomyId?: string }) {
    const { page, limit, search, sortBy, sortOrder, type, taxonomyId } = query;
    const skip = (page - 1) * limit;

    const qb = this.actorsRepository.createQueryBuilder('actor');

    qb.leftJoinAndSelect('actor.mainTaxonomy', 'mainTaxonomy');
    qb.leftJoinAndSelect('actor.taxonomies', 'taxonomies');
    qb.leftJoinAndSelect('actor.image', 'image');
    qb.leftJoinAndSelect('actor.addresses', 'addresses');
    qb.leftJoinAndSelect('addresses.country', 'addressCountry');
    qb.leftJoinAndSelect('actor.functionalCurrency', 'functionalCurrency');
    qb.leftJoinAndSelect('actor.parent', 'parent');

    if (type) {
      qb.andWhere('actor.type = :type', { type });
    }

    if (taxonomyId) {
      qb.andWhere(
        '(actor."mainTaxonomyId" = :taxonomyId OR EXISTS (SELECT 1 FROM actor_taxonomies at WHERE at."actorId" = actor.id AND at."taxonomyId" = :taxonomyId))',
        { taxonomyId },
      );
    }

    if (search) {
      qb.andWhere(
        '(actor.name ILIKE :search OR actor.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`actor.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('actor.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    for (const actor of data) {
      actor.addresses = this.addressesService.sortAddresses(actor.addresses ?? []);
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

  async findOne(id: string): Promise<Actor> {
    const actor = await this.actorsRepository.findOne({
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
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    actor.addresses = this.addressesService.sortAddresses(actor.addresses ?? []);
    const ancestorsWithSelf = await this.actorsRepository.findAncestors(actor);
    actor.ancestors = ancestorsWithSelf
      .filter((a) => a.id !== actor.id)
      .sort((a, b) => a.level - b.level);
    return actor;
  }

  async findTree(): Promise<Actor[]> {
    const trees = await this.actorsRepository.findTrees({ relations: ['image'] });
    const sortByName = (nodes: Actor[]): Actor[] => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      for (const node of nodes) {
        if (node.children?.length) sortByName(node.children);
      }
      return nodes;
    };
    return sortByName(trees);
  }

  async findRoots(): Promise<Actor[]> {
    return this.actorsRepository.find({
      where: { parentId: IsNull() },
      relations: ['mainTaxonomy', 'image', 'parent'],
      order: { name: 'ASC' },
    });
  }

  async findChildren(id: string): Promise<Actor[]> {
    await this.requireActor(id);
    return this.actorsRepository.find({
      where: { parentId: id },
      relations: ['mainTaxonomy', 'image', 'parent'],
      order: { name: 'ASC' },
    });
  }

  async findDescendants(id: string): Promise<Actor[]> {
    const actor = await this.requireActor(id);
    const withSelf = await this.actorsRepository.findDescendants(actor, {
      relations: ['image', 'parent'],
    });
    return withSelf
      .filter((a) => a.id !== id)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }

  async move(id: string, input: MoveActorInput): Promise<Actor> {
    const actor = await this.requireActor(id);

    let newParent: Actor | null = null;
    let newLevel = 0;
    if (input.parentId !== null) {
      if (input.parentId === id) {
        throw new BadRequestException('Cannot move an actor under itself');
      }
      newParent = await this.actorsRepository.findOne({ where: { id: input.parentId } });
      if (!newParent) {
        throw new NotFoundException('Parent actor not found');
      }
      const subtree = await this.actorsRepository.findDescendants(actor);
      if (subtree.some((d) => d.id === input.parentId)) {
        throw new BadRequestException('Cannot move an actor under its own descendant');
      }
      newLevel = newParent.level + 1;
    }

    const delta = newLevel - actor.level;
    actor.parent = newParent;
    actor.level = newLevel;
    await this.actorsRepository.save(actor);

    // Shift descendant levels by the same delta (subtree membership is
    // unchanged by the move, so the closure table addresses them correctly).
    if (delta !== 0) {
      await this.actorsRepository.query(
        `UPDATE "actors" SET "level" = "level" + $1
         WHERE "id" IN (
           SELECT "id_descendant" FROM "actors_closure"
           WHERE "id_ancestor" = $2 AND "id_descendant" <> $2
         )`,
        [delta, id],
      );
    }

    return this.findOne(id);
  }

  private async requireActor(id: string): Promise<Actor> {
    const actor = await this.actorsRepository.findOne({ where: { id } });
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }

  async update(id: string, input: UpdateActorInput): Promise<Actor> {
    const actor = await this.findOne(id);
    const { mainTaxonomyId, taxonomyIds, imageId, functionalCurrencyId, ...rest } = input;

    Object.assign(actor, rest);

    if (functionalCurrencyId !== undefined) {
      if (functionalCurrencyId === null) {
        actor.functionalCurrency = null;
        actor.functionalCurrencyId = null;
      } else {
        await this.assertCurrencyValue(functionalCurrencyId);
        actor.functionalCurrency = null;
        actor.functionalCurrencyId = functionalCurrencyId;
      }
    }

    if (imageId !== undefined) {
      if (imageId === null) {
        actor.image = null;
        actor.imageId = null;
      } else {
        const file = await this.fileRepository.findOne({ where: { id: imageId } });
        if (!file) {
          throw new NotFoundException('Image file not found');
        }
        actor.imageId = imageId;
        actor.image = file;
      }
    }

    if (mainTaxonomyId !== undefined) {
      if (mainTaxonomyId === null) {
        actor.mainTaxonomy = null;
        actor.mainTaxonomyId = null;
      } else {
        const taxonomy = await this.taxonomyRepository.findOne({
          where: { id: mainTaxonomyId },
        });
        if (!taxonomy) {
          throw new NotFoundException('Main taxonomy not found');
        }
        actor.mainTaxonomyId = mainTaxonomyId;
        actor.mainTaxonomy = taxonomy;
      }
    }

    if (taxonomyIds !== undefined) {
      if (taxonomyIds.length === 0) {
        actor.taxonomies = [];
      } else {
        const taxonomies = await this.taxonomyRepository.find({
          where: { id: In(taxonomyIds) },
        });
        if (taxonomies.length !== taxonomyIds.length) {
          throw new NotFoundException('One or more taxonomies not found');
        }
        actor.taxonomies = taxonomies;
      }
    }

    await this.actorsRepository.save(actor);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const actor = await this.findOne(id);
    const childCount = await this.actorsRepository.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException(
        'Actor has sub-actors. Move or delete them before deleting this actor.',
      );
    }
    await this.actorsRepository.remove(actor);
  }

  async getSnapshotReferences(id: string): Promise<{ invoiceItems: number }> {
    const actor = await this.actorsRepository.findOne({ where: { id } });
    if (!actor) throw new NotFoundException('Actor not found');

    const invoiceItems = await this.invoiceItemRepository.query(
      `SELECT COUNT(*) AS count FROM invoice_items ii
       JOIN invoices i ON i.id = ii."invoiceId"
       WHERE (i."fromActorId" = $1 AND ii."fromActorAmount" IS NOT NULL)
          OR (i."toActorId"   = $1 AND ii."toActorAmount"   IS NOT NULL)`,
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
