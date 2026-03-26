import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { AgreementTemplate } from './entities/agreement-template.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import {
  CreateAgreementTemplateInput,
  UpdateAgreementTemplateInput,
  MoveAgreementTemplateInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class AgreementTemplatesService {
  constructor(
    @InjectRepository(AgreementTemplate)
    private readonly templateRepository: TreeRepository<AgreementTemplate>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
  ) {}

  async create(input: CreateAgreementTemplateInput): Promise<AgreementTemplate> {
    const existing = await this.templateRepository.findOne({
      where: { name: input.name },
    });
    if (existing) {
      throw new ConflictException('Agreement template with this name already exists');
    }

    const template = this.templateRepository.create({
      name: input.name,
      type: input.type,
      purpose: input.purpose ?? null,
      description: input.description ?? null,
      link: input.link ?? null,
    });

    if (input.parentId) {
      const parent = await this.templateRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent agreement template not found');
      }
      template.parent = parent;
    }

    if (input.valueStreamId) {
      const valueStream = await this.valueStreamRepository.findOne({
        where: { id: input.valueStreamId },
      });
      if (!valueStream) {
        throw new NotFoundException('Value stream not found');
      }
      template.valueStreamId = input.valueStreamId;
      template.valueStream = valueStream;
    }

    const saved = await this.templateRepository.save(template);
    return this.findOne(saved.id);
  }

  async search(query: PaginationQuery & { type?: string; valueStreamId?: string }) {
    const { page, limit, search, sortBy, sortOrder, type, valueStreamId } = query;
    const skip = (page - 1) * limit;

    const qb = this.templateRepository.createQueryBuilder('template');

    qb.leftJoinAndSelect('template.valueStream', 'valueStream');

    if (type) {
      qb.andWhere('template.type = :type', { type });
    }

    if (valueStreamId) {
      qb.andWhere('template.valueStreamId = :valueStreamId', { valueStreamId });
    }

    if (search) {
      qb.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`template.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('template.createdAt', 'DESC');
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

  async findTree(): Promise<AgreementTemplate[]> {
    const trees = await this.templateRepository.findTrees({
      relations: ['valueStream'],
    });
    return trees;
  }

  async findRoots(): Promise<AgreementTemplate[]> {
    return this.templateRepository.findRoots();
  }

  async findOne(id: string): Promise<AgreementTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['valueStream'],
    });
    if (!template) {
      throw new NotFoundException('Agreement template not found');
    }
    return template;
  }

  async findChildren(id: string): Promise<AgreementTemplate[]> {
    const parent = await this.findOne(id);
    const tree = await this.templateRepository.findDescendantsTree(parent, {
      depth: 1,
    });
    return tree.children;
  }

  async update(id: string, input: UpdateAgreementTemplateInput): Promise<AgreementTemplate> {
    const template = await this.findOne(id);

    if (input.name && input.name !== template.name) {
      const existing = await this.templateRepository.findOne({
        where: { name: input.name },
      });
      if (existing) {
        throw new ConflictException('Agreement template with this name already exists');
      }
    }

    if (input.valueStreamId !== undefined) {
      if (input.valueStreamId === null) {
        template.valueStream = null;
        template.valueStreamId = null;
      } else {
        const valueStream = await this.valueStreamRepository.findOne({
          where: { id: input.valueStreamId },
        });
        if (!valueStream) {
          throw new NotFoundException('Value stream not found');
        }
        template.valueStreamId = input.valueStreamId;
        template.valueStream = valueStream;
      }
    }

    if (input.name !== undefined) template.name = input.name;
    if (input.type !== undefined) template.type = input.type;
    if (input.purpose !== undefined) template.purpose = input.purpose || null;
    if (input.description !== undefined) template.description = input.description || null;
    if (input.link !== undefined) template.link = input.link || null;

    await this.templateRepository.save(template);
    return this.findOne(id);
  }

  async move(id: string, input: MoveAgreementTemplateInput): Promise<AgreementTemplate> {
    const template = await this.findOne(id);

    if (input.parentId === null) {
      template.parent = null;
    } else {
      const parent = await this.templateRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent agreement template not found');
      }
      template.parent = parent;
    }

    await this.templateRepository.save(template);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    const children = await this.templateRepository.findDescendantsTree(template, {
      depth: 1,
    });
    if (children.children && children.children.length > 0) {
      throw new ConflictException(
        'Cannot delete agreement template with children. Remove children first.',
      );
    }
    await this.templateRepository.remove([template]);
  }
}
