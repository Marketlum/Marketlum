import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { MoveChannelDto } from './dto/move-channel.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, IsNull } from 'typeorm';
import { Channel } from './entities/channel.entity';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channel)
    private channelRepository: TreeRepository<Channel>,
  ) {}

  async create(createChannelDto: CreateChannelDto): Promise<Channel> {
    const channel = this.channelRepository.create(createChannelDto);

    if (createChannelDto.parentId) {
      const parent = await this.channelRepository.findOneBy({ id: createChannelDto.parentId });

      if (!parent) {
        throw new NotFoundException('Parent channel not found.');
      }

      await this.checkSiblingNameUniqueness(createChannelDto.name, createChannelDto.parentId);
      channel.parent = parent;
    } else {
      await this.checkSiblingNameUniqueness(createChannelDto.name, null);
    }

    return this.channelRepository.save(channel);
  }

  async update(id: string, updateChannelDto: UpdateChannelDto): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    if (updateChannelDto.parentId !== undefined) {
      await this.validateParentChange(id, updateChannelDto.parentId);

      if (updateChannelDto.parentId) {
        const parent = await this.channelRepository.findOneBy({ id: updateChannelDto.parentId });
        if (!parent) {
          throw new NotFoundException('Parent channel not found.');
        }
        channel.parent = parent;
      } else {
        (channel as any).parent = null;
      }
    }

    if (updateChannelDto.name && updateChannelDto.name !== channel.name) {
      const parentId = updateChannelDto.parentId !== undefined
        ? updateChannelDto.parentId
        : channel.parent?.id || null;
      await this.checkSiblingNameUniqueness(updateChannelDto.name, parentId, id);
    }

    if (updateChannelDto.name) channel.name = updateChannelDto.name;
    if (updateChannelDto.purpose !== undefined) channel.purpose = updateChannelDto.purpose;
    if (updateChannelDto.type) channel.type = updateChannelDto.type;

    return this.channelRepository.save(channel);
  }

  async move(id: string, moveChannelDto: MoveChannelDto): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    const newParentId = moveChannelDto.parentId ?? null;
    await this.validateParentChange(id, newParentId);
    await this.checkSiblingNameUniqueness(channel.name, newParentId, id);

    if (newParentId) {
      const parent = await this.channelRepository.findOneBy({ id: newParentId });
      if (!parent) {
        throw new NotFoundException('Parent channel not found.');
      }
      channel.parent = parent;
    } else {
      (channel as any).parent = null;
    }

    return this.channelRepository.save(channel);
  }

  findTree(): Promise<Channel[]> {
    return this.channelRepository.findTrees();
  }

  async findAll(parentId?: string, type?: string): Promise<Channel[]> {
    const queryBuilder = this.channelRepository.createQueryBuilder('channel');

    if (parentId === 'null' || parentId === '') {
      queryBuilder.where('channel.parentId IS NULL');
    } else if (parentId) {
      queryBuilder.where('channel.parentId = :parentId', { parentId });
    }

    if (type) {
      queryBuilder.andWhere('channel.type = :type', { type });
    }

    queryBuilder.orderBy('channel.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  findOne(id: string): Promise<Channel | null> {
    return this.channelRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
  }

  async remove(id: string): Promise<void> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    if (channel.children && channel.children.length > 0) {
      throw new ConflictException('Cannot delete a channel that has children.');
    }

    await this.channelRepository.delete(id);
  }

  private async validateParentChange(channelId: string, newParentId: string | null | undefined): Promise<void> {
    if (!newParentId) {
      return;
    }

    if (channelId === newParentId) {
      throw new BadRequestException('A channel cannot be its own parent.');
    }

    const channel = await this.channelRepository.findOneBy({ id: channelId });
    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    const descendants = await this.channelRepository.findDescendants(channel);
    const descendantIds = descendants.map(d => d.id);

    if (descendantIds.includes(newParentId)) {
      throw new BadRequestException('Cannot set a descendant as the parent (would create a cycle).');
    }
  }

  private async checkSiblingNameUniqueness(
    name: string,
    parentId: string | null,
    excludeId?: string
  ): Promise<void> {
    const queryBuilder = this.channelRepository.createQueryBuilder('channel');

    queryBuilder.where('LOWER(channel.name) = LOWER(:name)', { name: name.trim() });

    if (parentId) {
      queryBuilder.andWhere('channel.parentId = :parentId', { parentId });
    } else {
      queryBuilder.andWhere('channel.parentId IS NULL');
    }

    if (excludeId) {
      queryBuilder.andWhere('channel.id != :excludeId', { excludeId });
    }

    const existing = await queryBuilder.getOne();

    if (existing) {
      throw new ConflictException('A channel with this name already exists at this level.');
    }
  }
}
