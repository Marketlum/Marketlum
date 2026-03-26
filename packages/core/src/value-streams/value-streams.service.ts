import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { ValueStream } from './entities/value-stream.entity';
import { User } from '../users/entities/user.entity';
import { File } from '../files/entities/file.entity';
import {
  CreateValueStreamInput,
  UpdateValueStreamInput,
  MoveValueStreamInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class ValueStreamsService {
  constructor(
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: TreeRepository<ValueStream>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async create(input: CreateValueStreamInput): Promise<ValueStream> {
    const { parentId, leadUserId, imageId, ...rest } = input;

    const valueStream = this.valueStreamRepository.create({
      ...rest,
      purpose: rest.purpose ?? null,
    });

    if (parentId) {
      const parent = await this.valueStreamRepository.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent value stream not found');
      }
      valueStream.parent = parent;
    }

    if (leadUserId) {
      const user = await this.userRepository.findOne({
        where: { id: leadUserId },
      });
      if (!user) {
        throw new NotFoundException('Lead user not found');
      }
      valueStream.leadUserId = leadUserId;
      valueStream.lead = user;
    }

    if (imageId) {
      const file = await this.fileRepository.findOne({
        where: { id: imageId },
      });
      if (!file) {
        throw new NotFoundException('Image file not found');
      }
      valueStream.imageId = imageId;
      valueStream.image = file;
    }

    const saved = await this.valueStreamRepository.save(valueStream);
    return this.findOne(saved.id);
  }

  async search(query: PaginationQuery) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const qb = this.valueStreamRepository.createQueryBuilder('valueStream');

    qb.leftJoinAndSelect('valueStream.lead', 'lead');
    qb.leftJoinAndSelect('valueStream.image', 'image');

    if (search) {
      qb.andWhere(
        '(valueStream.name ILIKE :search OR valueStream.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`valueStream.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('valueStream.createdAt', 'DESC');
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

  async findTree(): Promise<ValueStream[]> {
    const trees = await this.valueStreamRepository.findTrees({
      relations: ['lead', 'image'],
    });
    return trees;
  }

  async findRoots(): Promise<ValueStream[]> {
    return this.valueStreamRepository.findRoots();
  }

  async findOne(id: string): Promise<ValueStream> {
    const valueStream = await this.valueStreamRepository.findOne({
      where: { id },
      relations: ['lead', 'image'],
    });
    if (!valueStream) {
      throw new NotFoundException('Value stream not found');
    }
    return valueStream;
  }

  async findChildren(id: string): Promise<ValueStream[]> {
    const parent = await this.findOne(id);
    const tree = await this.valueStreamRepository.findDescendantsTree(parent, {
      depth: 1,
    });
    return tree.children;
  }

  async findDescendantsTree(id: string): Promise<ValueStream> {
    const parent = await this.findOne(id);
    return this.valueStreamRepository.findDescendantsTree(parent);
  }

  async update(id: string, input: UpdateValueStreamInput): Promise<ValueStream> {
    const valueStream = await this.findOne(id);
    const { leadUserId, imageId, ...rest } = input;

    Object.assign(valueStream, rest);

    if (leadUserId !== undefined) {
      if (leadUserId === null) {
        valueStream.lead = null;
        valueStream.leadUserId = null;
      } else {
        const user = await this.userRepository.findOne({
          where: { id: leadUserId },
        });
        if (!user) {
          throw new NotFoundException('Lead user not found');
        }
        valueStream.leadUserId = leadUserId;
        valueStream.lead = user;
      }
    }

    if (imageId !== undefined) {
      if (imageId === null) {
        valueStream.image = null;
        valueStream.imageId = null;
      } else {
        const file = await this.fileRepository.findOne({
          where: { id: imageId },
        });
        if (!file) {
          throw new NotFoundException('Image file not found');
        }
        valueStream.imageId = imageId;
        valueStream.image = file;
      }
    }

    await this.valueStreamRepository.save(valueStream);
    return this.findOne(id);
  }

  async move(id: string, input: MoveValueStreamInput): Promise<ValueStream> {
    const valueStream = await this.findOne(id);

    if (input.parentId === null) {
      valueStream.parent = null;
    } else {
      const parent = await this.valueStreamRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent value stream not found');
      }
      valueStream.parent = parent;
    }

    return this.valueStreamRepository.save(valueStream);
  }

  async remove(id: string): Promise<void> {
    const valueStream = await this.findOne(id);
    const descendants = await this.valueStreamRepository.findDescendants(valueStream);
    descendants.sort((a, b) => b.level - a.level);
    await this.valueStreamRepository.remove(descendants);
  }
}
