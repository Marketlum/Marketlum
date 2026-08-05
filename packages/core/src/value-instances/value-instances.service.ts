import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValueInstance } from './entities/value-instance.entity';
import { Value } from '../values/entities/value.entity';
import { Actor } from '../actors/entities/actor.entity';
import { File } from '../files/entities/file.entity';
import {
  CreateValueInstanceInput,
  UpdateValueInstanceInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class ValueInstancesService {
  constructor(
    @InjectRepository(ValueInstance)
    private readonly repository: Repository<ValueInstance>,
    @InjectRepository(Value)
    private readonly valuesRepository: Repository<Value>,
    @InjectRepository(Actor)
    private readonly actorsRepository: Repository<Actor>,
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
  ) {}

  async create(input: CreateValueInstanceInput): Promise<ValueInstance> {
    const { valueId, fromActorId, toActorId, imageId, ...rest } = input;

    const value = await this.valuesRepository.findOne({ where: { id: valueId } });
    if (!value) {
      throw new NotFoundException('Value not found');
    }

    const instance = this.repository.create({ ...rest, valueId });

    if (fromActorId) {
      const actor = await this.actorsRepository.findOne({ where: { id: fromActorId } });
      if (!actor) {
        throw new NotFoundException('From actor not found');
      }
      instance.fromActorId = fromActorId;
    }

    if (toActorId) {
      const actor = await this.actorsRepository.findOne({ where: { id: toActorId } });
      if (!actor) {
        throw new NotFoundException('To actor not found');
      }
      instance.toActorId = toActorId;
    }

    if (imageId) {
      const file = await this.filesRepository.findOne({ where: { id: imageId } });
      if (!file) {
        throw new NotFoundException('Image file not found');
      }
      instance.imageId = imageId;
    }

    let saved: ValueInstance;
    try {
      saved = await this.repository.save(instance);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Value instance with this code already exists');
      }
      throw error;
    }
    return this.findOne(saved.id);
  }

  async findByCode(code: string): Promise<ValueInstance> {
    const instance = await this.repository.findOne({
      where: { code },
      relations: ['value', 'fromActor', 'toActor', 'image'],
    });
    if (!instance) {
      throw new NotFoundException('Value instance not found');
    }
    return instance;
  }

  async findAll(
    query: PaginationQuery & {
      valueId?: string;
      fromActorId?: string;
      toActorId?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, valueId, fromActorId, toActorId } = query;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('vi');

    qb.leftJoinAndSelect('vi.value', 'value');
    qb.leftJoinAndSelect('vi.fromActor', 'fromActor');
    qb.leftJoinAndSelect('vi.toActor', 'toActor');
    qb.leftJoinAndSelect('vi.image', 'image');

    if (valueId) {
      qb.andWhere('vi."valueId" = :valueId', { valueId });
    }

    if (fromActorId) {
      qb.andWhere('vi."fromActorId" = :fromActorId', { fromActorId });
    }

    if (toActorId) {
      qb.andWhere('vi."toActorId" = :toActorId', { toActorId });
    }

    if (search) {
      qb.andWhere(
        '(vi.name ILIKE :search OR vi.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`vi.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('vi.createdAt', 'DESC');
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

  async findOne(id: string): Promise<ValueInstance> {
    const instance = await this.repository.findOne({
      where: { id },
      relations: ['value', 'fromActor', 'toActor', 'image'],
    });
    if (!instance) {
      throw new NotFoundException('Value instance not found');
    }
    return instance;
  }

  async update(id: string, input: UpdateValueInstanceInput): Promise<ValueInstance> {
    const instance = await this.findOne(id);
    const { valueId, fromActorId, toActorId, imageId, ...rest } = input;

    Object.assign(instance, rest);

    if (valueId !== undefined) {
      const value = await this.valuesRepository.findOne({ where: { id: valueId } });
      if (!value) {
        throw new NotFoundException('Value not found');
      }
      instance.valueId = valueId;
      instance.value = value;
    }

    if (fromActorId !== undefined) {
      if (fromActorId === null) {
        instance.fromActor = null;
        instance.fromActorId = null;
      } else {
        const actor = await this.actorsRepository.findOne({ where: { id: fromActorId } });
        if (!actor) {
          throw new NotFoundException('From actor not found');
        }
        instance.fromActorId = fromActorId;
        instance.fromActor = actor;
      }
    }

    if (toActorId !== undefined) {
      if (toActorId === null) {
        instance.toActor = null;
        instance.toActorId = null;
      } else {
        const actor = await this.actorsRepository.findOne({ where: { id: toActorId } });
        if (!actor) {
          throw new NotFoundException('To actor not found');
        }
        instance.toActorId = toActorId;
        instance.toActor = actor;
      }
    }

    if (imageId !== undefined) {
      if (imageId === null) {
        instance.image = null;
        instance.imageId = null;
      } else {
        const file = await this.filesRepository.findOne({ where: { id: imageId } });
        if (!file) {
          throw new NotFoundException('Image file not found');
        }
        instance.imageId = imageId;
        instance.image = file;
      }
    }

    await this.repository.save(instance);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const instance = await this.findOne(id);
    await this.repository.remove(instance);
  }
}
