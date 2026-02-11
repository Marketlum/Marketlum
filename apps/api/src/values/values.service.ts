import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Value } from './entities/value.entity';
import { ValueImage } from './entities/value-image.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Agent } from '../agents/entities/agent.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import {
  CreateValueInput,
  UpdateValueInput,
  PaginationQuery,
  ValueType,
} from '@marketlum/shared';

@Injectable()
export class ValuesService {
  constructor(
    @InjectRepository(Value)
    private readonly valuesRepository: Repository<Value>,
    @InjectRepository(ValueImage)
    private readonly valueImageRepository: Repository<ValueImage>,
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: Repository<Taxonomy>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
  ) {}

  async create(input: CreateValueInput): Promise<Value> {
    const { mainTaxonomyId, taxonomyIds, fileIds, imageIds, agentId, parentId, parentType, valueStreamId, ...rest } = input;

    const value = this.valuesRepository.create(rest);

    if (parentId) {
      const parent = await this.valuesRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException('Parent value not found');
      }
      value.parentId = parentId;
      value.parent = parent;
      value.parentType = parentType ?? null;
    }

    if (agentId) {
      const agent = await this.agentRepository.findOne({ where: { id: agentId } });
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      value.agentId = agentId;
      value.agent = agent;
    }

    if (valueStreamId) {
      const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
      if (!vs) {
        throw new NotFoundException('Value stream not found');
      }
      value.valueStreamId = valueStreamId;
      value.valueStream = vs;
    }

    if (mainTaxonomyId) {
      const taxonomy = await this.taxonomyRepository.findOne({
        where: { id: mainTaxonomyId },
      });
      if (!taxonomy) {
        throw new NotFoundException('Main taxonomy not found');
      }
      value.mainTaxonomyId = mainTaxonomyId;
      value.mainTaxonomy = taxonomy;
    }

    if (taxonomyIds && taxonomyIds.length > 0) {
      const taxonomies = await this.taxonomyRepository.find({
        where: { id: In(taxonomyIds) },
      });
      if (taxonomies.length !== taxonomyIds.length) {
        throw new NotFoundException('One or more taxonomies not found');
      }
      value.taxonomies = taxonomies;
    } else {
      value.taxonomies = [];
    }

    if (fileIds && fileIds.length > 0) {
      const files = await this.fileRepository.find({
        where: { id: In(fileIds) },
      });
      if (files.length !== fileIds.length) {
        throw new NotFoundException('One or more files not found');
      }
      value.files = files;
    } else {
      value.files = [];
    }

    const saved = await this.valuesRepository.save(value);

    if (imageIds && imageIds.length > 0) {
      const files = await this.fileRepository.find({ where: { id: In(imageIds) } });
      if (files.length !== imageIds.length) {
        throw new NotFoundException('One or more image files not found');
      }
      const imageEntities = imageIds.map((fileId, index) => {
        return this.valueImageRepository.create({ valueId: saved.id, fileId, position: index });
      });
      await this.valueImageRepository.save(imageEntities);
    }

    return this.findOne(saved.id);
  }

  async findAll(query: PaginationQuery & { type?: ValueType; taxonomyId?: string; agentId?: string; valueStreamId?: string }) {
    const { page, limit, search, sortBy, sortOrder, type, taxonomyId, agentId, valueStreamId } = query;
    const skip = (page - 1) * limit;

    const qb = this.valuesRepository.createQueryBuilder('value');

    qb.leftJoinAndSelect('value.mainTaxonomy', 'mainTaxonomy');
    qb.leftJoinAndSelect('value.taxonomies', 'taxonomies');
    qb.leftJoinAndSelect('value.files', 'files');
    qb.leftJoinAndSelect('value.images', 'images');
    qb.leftJoinAndSelect('images.file', 'imageFile');
    qb.leftJoinAndSelect('value.agent', 'agent');
    qb.leftJoinAndSelect('value.valueStream', 'valueStream');
    qb.leftJoinAndSelect('value.parent', 'parent');

    if (type) {
      qb.andWhere('value.type = :type', { type });
    }

    if (agentId) {
      qb.andWhere('value."agentId" = :agentId', { agentId });
    }

    if (valueStreamId) {
      qb.andWhere('value."valueStreamId" = :valueStreamId', { valueStreamId });
    }

    if (taxonomyId) {
      qb.andWhere(
        '(value."mainTaxonomyId" = :taxonomyId OR EXISTS (SELECT 1 FROM value_taxonomies vt WHERE vt."valueId" = value.id AND vt."taxonomyId" = :taxonomyId))',
        { taxonomyId },
      );
    }

    if (search) {
      qb.andWhere(
        '(value.name ILIKE :search OR value.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`value.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('value.createdAt', 'DESC');
    }
    qb.addOrderBy('images.position', 'ASC');

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((v) => this.transformValue(v)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Value> {
    const value = await this.findOneRaw(id);
    return this.transformValue(value);
  }

  private async findOneRaw(id: string): Promise<Value> {
    const value = await this.valuesRepository.findOne({
      where: { id },
      relations: ['mainTaxonomy', 'taxonomies', 'files', 'images', 'images.file', 'agent', 'valueStream', 'parent'],
    });
    if (!value) {
      throw new NotFoundException('Value not found');
    }
    value.images = (value.images ?? []).sort((a, b) => a.position - b.position);
    return value;
  }

  async update(id: string, input: UpdateValueInput): Promise<Value> {
    const value = await this.findOneRaw(id);
    const { mainTaxonomyId, taxonomyIds, fileIds, imageIds, agentId, parentId, parentType, valueStreamId, ...rest } = input;

    Object.assign(value, rest);

    if (parentId !== undefined) {
      if (parentId === null) {
        value.parent = null;
        value.parentId = null;
        value.parentType = null;
      } else {
        const parent = await this.valuesRepository.findOne({ where: { id: parentId } });
        if (!parent) {
          throw new NotFoundException('Parent value not found');
        }
        value.parentId = parentId;
        value.parent = parent;
        if (parentType !== undefined) {
          value.parentType = parentType ?? null;
        }
      }
    } else if (parentType !== undefined) {
      value.parentType = parentType ?? null;
    }

    if (agentId !== undefined) {
      if (agentId === null) {
        value.agent = null;
        value.agentId = null;
      } else {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) {
          throw new NotFoundException('Agent not found');
        }
        value.agentId = agentId;
        value.agent = agent;
      }
    }

    if (valueStreamId !== undefined) {
      if (valueStreamId === null) {
        value.valueStream = null;
        value.valueStreamId = null;
      } else {
        const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
        if (!vs) {
          throw new NotFoundException('Value stream not found');
        }
        value.valueStreamId = valueStreamId;
        value.valueStream = vs;
      }
    }

    if (mainTaxonomyId !== undefined) {
      if (mainTaxonomyId === null) {
        value.mainTaxonomy = null;
        value.mainTaxonomyId = null;
      } else {
        const taxonomy = await this.taxonomyRepository.findOne({
          where: { id: mainTaxonomyId },
        });
        if (!taxonomy) {
          throw new NotFoundException('Main taxonomy not found');
        }
        value.mainTaxonomyId = mainTaxonomyId;
        value.mainTaxonomy = taxonomy;
      }
    }

    if (taxonomyIds !== undefined) {
      if (taxonomyIds.length === 0) {
        value.taxonomies = [];
      } else {
        const taxonomies = await this.taxonomyRepository.find({
          where: { id: In(taxonomyIds) },
        });
        if (taxonomies.length !== taxonomyIds.length) {
          throw new NotFoundException('One or more taxonomies not found');
        }
        value.taxonomies = taxonomies;
      }
    }

    if (fileIds !== undefined) {
      if (fileIds.length === 0) {
        value.files = [];
      } else {
        const files = await this.fileRepository.find({
          where: { id: In(fileIds) },
        });
        if (files.length !== fileIds.length) {
          throw new NotFoundException('One or more files not found');
        }
        value.files = files;
      }
    }

    // Remove images from entity to avoid cascade issues — managed separately
    delete (value as any).images;
    await this.valuesRepository.save(value);

    if (imageIds !== undefined) {
      await this.valueImageRepository.delete({ valueId: id });
      if (imageIds.length > 0) {
        const files = await this.fileRepository.find({ where: { id: In(imageIds) } });
        if (files.length !== imageIds.length) {
          throw new NotFoundException('One or more image files not found');
        }
        const imageEntities = imageIds.map((fileId, index) => {
          return this.valueImageRepository.create({ valueId: id, fileId, position: index });
        });
        await this.valueImageRepository.save(imageEntities);
      }
    }

    return this.findOne(id);
  }

  private transformValue(value: Value): Value {
    if (value.images) {
      (value as any).images = value.images.map((vi) => ({
        id: vi.file.id,
        originalName: vi.file.originalName,
        storedName: vi.file.storedName,
        mimeType: vi.file.mimeType,
        size: vi.file.size,
        position: vi.position,
      }));
    } else {
      (value as any).images = [];
    }
    return value;
  }

  async remove(id: string): Promise<void> {
    const value = await this.findOneRaw(id);
    await this.valuesRepository.remove(value);
  }
}
