import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { Channel } from './channel.entity';
import { Actor } from '../actors/entities/actor.entity';
import {
  CreateChannelInput,
  UpdateChannelInput,
  MoveChannelInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: TreeRepository<Channel>,
    @InjectRepository(Actor)
    private readonly actorRepository: Repository<Actor>,
  ) {}

  async create(input: CreateChannelInput): Promise<Channel> {
    const { parentId, actorId, ...rest } = input;

    const channel = this.channelRepository.create({
      ...rest,
      purpose: rest.purpose ?? null,
    });

    if (parentId) {
      const parent = await this.channelRepository.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent channel not found');
      }
      channel.parent = parent;
    }

    if (actorId) {
      const actor = await this.actorRepository.findOne({
        where: { id: actorId },
      });
      if (!actor) {
        throw new NotFoundException('Actor not found');
      }
      channel.actorId = actorId;
      channel.actor = actor;
    }

    let saved: Channel;
    try {
      saved = await this.channelRepository.save(channel);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Channel with this code already exists');
      }
      throw error;
    }
    return this.findOne(saved.id);
  }

  async findByCode(code: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { code },
      relations: ['actor'],
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  async search(query: PaginationQuery & { actorId?: string }) {
    const { page, limit, search, sortBy, sortOrder, actorId } = query;
    const skip = (page - 1) * limit;

    const qb = this.channelRepository.createQueryBuilder('channel');

    qb.leftJoinAndSelect('channel.actor', 'actor');

    if (actorId) {
      qb.andWhere('channel.actorId = :actorId', { actorId });
    }

    if (search) {
      qb.andWhere(
        '(channel.name ILIKE :search OR channel.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`channel.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('channel.createdAt', 'DESC');
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

  async findTree(): Promise<Channel[]> {
    const trees = await this.channelRepository.findTrees({
      relations: ['actor'],
    });
    return trees;
  }

  async findOne(id: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['actor'],
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  async findChildren(id: string): Promise<Channel[]> {
    const parent = await this.findOne(id);
    const tree = await this.channelRepository.findDescendantsTree(parent, {
      depth: 1,
    });
    return tree.children;
  }

  async findRoots(): Promise<Channel[]> {
    return this.channelRepository.findRoots();
  }

  async update(id: string, input: UpdateChannelInput): Promise<Channel> {
    const channel = await this.findOne(id);
    const { actorId, ...rest } = input;

    Object.assign(channel, rest);

    if (actorId !== undefined) {
      if (actorId === null) {
        channel.actor = null;
        channel.actorId = null;
      } else {
        const actor = await this.actorRepository.findOne({
          where: { id: actorId },
        });
        if (!actor) {
          throw new NotFoundException('Actor not found');
        }
        channel.actorId = actorId;
        channel.actor = actor;
      }
    }

    await this.channelRepository.save(channel);
    return this.findOne(id);
  }

  async move(id: string, input: MoveChannelInput): Promise<Channel> {
    const channel = await this.findOne(id);

    if (input.parentId === null) {
      channel.parent = null;
    } else {
      const parent = await this.channelRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent channel not found');
      }
      channel.parent = parent;
    }

    return this.channelRepository.save(channel);
  }

  async remove(id: string): Promise<void> {
    const channel = await this.findOne(id);
    const descendants = await this.channelRepository.findDescendants(channel);
    descendants.sort((a, b) => b.level - a.level);
    await this.channelRepository.remove(descendants);
  }
}
