import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValueInstance } from './entities/value-instance.entity';
import { Value } from '../values/entities/value.entity';
import { Agent } from '../agents/entities/agent.entity';
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
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
  ) {}

  async create(input: CreateValueInstanceInput): Promise<ValueInstance> {
    const { valueId, fromAgentId, toAgentId, imageId, ...rest } = input;

    const value = await this.valuesRepository.findOne({ where: { id: valueId } });
    if (!value) {
      throw new NotFoundException('Value not found');
    }

    const instance = this.repository.create({ ...rest, valueId });

    if (fromAgentId) {
      const agent = await this.agentsRepository.findOne({ where: { id: fromAgentId } });
      if (!agent) {
        throw new NotFoundException('From agent not found');
      }
      instance.fromAgentId = fromAgentId;
    }

    if (toAgentId) {
      const agent = await this.agentsRepository.findOne({ where: { id: toAgentId } });
      if (!agent) {
        throw new NotFoundException('To agent not found');
      }
      instance.toAgentId = toAgentId;
    }

    if (imageId) {
      const file = await this.filesRepository.findOne({ where: { id: imageId } });
      if (!file) {
        throw new NotFoundException('Image file not found');
      }
      instance.imageId = imageId;
    }

    const saved = await this.repository.save(instance);
    return this.findOne(saved.id);
  }

  async findAll(
    query: PaginationQuery & {
      valueId?: string;
      fromAgentId?: string;
      toAgentId?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, valueId, fromAgentId, toAgentId } = query;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('vi');

    qb.leftJoinAndSelect('vi.value', 'value');
    qb.leftJoinAndSelect('vi.fromAgent', 'fromAgent');
    qb.leftJoinAndSelect('vi.toAgent', 'toAgent');
    qb.leftJoinAndSelect('vi.image', 'image');

    if (valueId) {
      qb.andWhere('vi."valueId" = :valueId', { valueId });
    }

    if (fromAgentId) {
      qb.andWhere('vi."fromAgentId" = :fromAgentId', { fromAgentId });
    }

    if (toAgentId) {
      qb.andWhere('vi."toAgentId" = :toAgentId', { toAgentId });
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
      relations: ['value', 'fromAgent', 'toAgent', 'image'],
    });
    if (!instance) {
      throw new NotFoundException('Value instance not found');
    }
    return instance;
  }

  async update(id: string, input: UpdateValueInstanceInput): Promise<ValueInstance> {
    const instance = await this.findOne(id);
    const { valueId, fromAgentId, toAgentId, imageId, ...rest } = input;

    Object.assign(instance, rest);

    if (valueId !== undefined) {
      const value = await this.valuesRepository.findOne({ where: { id: valueId } });
      if (!value) {
        throw new NotFoundException('Value not found');
      }
      instance.valueId = valueId;
      instance.value = value;
    }

    if (fromAgentId !== undefined) {
      if (fromAgentId === null) {
        instance.fromAgent = null;
        instance.fromAgentId = null;
      } else {
        const agent = await this.agentsRepository.findOne({ where: { id: fromAgentId } });
        if (!agent) {
          throw new NotFoundException('From agent not found');
        }
        instance.fromAgentId = fromAgentId;
        instance.fromAgent = agent;
      }
    }

    if (toAgentId !== undefined) {
      if (toAgentId === null) {
        instance.toAgent = null;
        instance.toAgentId = null;
      } else {
        const agent = await this.agentsRepository.findOne({ where: { id: toAgentId } });
        if (!agent) {
          throw new NotFoundException('To agent not found');
        }
        instance.toAgentId = toAgentId;
        instance.toAgent = agent;
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
