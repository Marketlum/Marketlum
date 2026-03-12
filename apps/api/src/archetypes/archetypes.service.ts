import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Archetype } from './entities/archetype.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import {
  CreateArchetypeInput,
  UpdateArchetypeInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class ArchetypesService {
  constructor(
    @InjectRepository(Archetype)
    private readonly archetypeRepository: Repository<Archetype>,
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: Repository<Taxonomy>,
  ) {}

  async create(input: CreateArchetypeInput): Promise<Archetype> {
    const { taxonomyIds, ...rest } = input;

    const existing = await this.archetypeRepository.findOne({
      where: { name: rest.name },
    });
    if (existing) {
      throw new ConflictException('Archetype with this name already exists');
    }

    const archetype = this.archetypeRepository.create({
      ...rest,
      purpose: rest.purpose ?? null,
      description: rest.description ?? null,
    });

    if (taxonomyIds && taxonomyIds.length > 0) {
      const taxonomies = await this.taxonomyRepository.findBy({
        id: In(taxonomyIds),
      });
      if (taxonomies.length !== taxonomyIds.length) {
        throw new NotFoundException('One or more taxonomies not found');
      }
      archetype.taxonomies = taxonomies;
    } else {
      archetype.taxonomies = [];
    }

    const saved = await this.archetypeRepository.save(archetype);
    return this.findOne(saved.id);
  }

  async search(query: PaginationQuery & { taxonomyId?: string }) {
    const { page, limit, search, sortBy, sortOrder, taxonomyId } = query;
    const skip = (page - 1) * limit;

    const qb = this.archetypeRepository.createQueryBuilder('archetype');

    qb.leftJoinAndSelect('archetype.taxonomies', 'taxonomies');

    if (taxonomyId) {
      qb.andWhere(
        `archetype.id IN (SELECT "archetypeId" FROM "archetype_taxonomies" WHERE "taxonomyId" = :taxonomyId)`,
        { taxonomyId },
      );
    }

    if (search) {
      qb.andWhere(
        '(archetype.name ILIKE :search OR archetype.purpose ILIKE :search OR archetype.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`archetype.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('archetype.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Archetype> {
    const archetype = await this.archetypeRepository.findOne({
      where: { id },
      relations: ['taxonomies'],
    });
    if (!archetype) {
      throw new NotFoundException('Archetype not found');
    }
    return archetype;
  }

  async update(id: string, input: UpdateArchetypeInput): Promise<Archetype> {
    const archetype = await this.findOne(id);
    const { taxonomyIds, ...rest } = input;

    if (rest.name !== undefined && rest.name !== archetype.name) {
      const existing = await this.archetypeRepository.findOne({
        where: { name: rest.name },
      });
      if (existing) {
        throw new ConflictException('Archetype with this name already exists');
      }
    }

    if (rest.name !== undefined) archetype.name = rest.name;
    if (rest.purpose !== undefined) archetype.purpose = rest.purpose ?? null;
    if (rest.description !== undefined)
      archetype.description = rest.description ?? null;

    if (taxonomyIds !== undefined) {
      if (taxonomyIds.length === 0) {
        archetype.taxonomies = [];
      } else {
        const taxonomies = await this.taxonomyRepository.findBy({
          id: In(taxonomyIds),
        });
        if (taxonomies.length !== taxonomyIds.length) {
          throw new NotFoundException('One or more taxonomies not found');
        }
        archetype.taxonomies = taxonomies;
      }
    }

    await this.archetypeRepository.save(archetype);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const archetype = await this.findOne(id);
    await this.archetypeRepository.remove(archetype);
  }
}
