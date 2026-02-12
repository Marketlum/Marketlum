import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { Channel } from './channel.entity';
import { Agent } from '../agents/entities/agent.entity';
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
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  async create(input: CreateChannelInput): Promise<Channel> {
    const { parentId, agentId, ...rest } = input;

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

    if (agentId) {
      const agent = await this.agentRepository.findOne({
        where: { id: agentId },
      });
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      channel.agentId = agentId;
      channel.agent = agent;
    }

    const saved = await this.channelRepository.save(channel);
    return this.findOne(saved.id);
  }

  async search(query: PaginationQuery & { agentId?: string }) {
    const { page, limit, search, sortBy, sortOrder, agentId } = query;
    const skip = (page - 1) * limit;

    const qb = this.channelRepository.createQueryBuilder('channel');

    qb.leftJoinAndSelect('channel.agent', 'agent');

    if (agentId) {
      qb.andWhere('channel.agentId = :agentId', { agentId });
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
      relations: ['agent'],
    });
    return trees;
  }

  async findOne(id: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['agent'],
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
    const { agentId, ...rest } = input;

    Object.assign(channel, rest);

    if (agentId !== undefined) {
      if (agentId === null) {
        channel.agent = null;
        channel.agentId = null;
      } else {
        const agent = await this.agentRepository.findOne({
          where: { id: agentId },
        });
        if (!agent) {
          throw new NotFoundException('Agent not found');
        }
        channel.agentId = agentId;
        channel.agent = agent;
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
