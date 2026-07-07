import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValueStream } from '@marketlum/core';
import type {
  AssignRdhyPlatformInput,
  CreateRdhyPlatformInput,
  RdhyPlatformDetailResponse,
  RdhyPlatformLookupResponse,
  RdhyPlatformResponse,
  UpdateRdhyPlatformInput,
} from '../shared/schemas';
import { RdhyPlatform } from './rdhy-platform.entity';
import { RdhyPlatformValueStream } from './rdhy-platform-value-stream.entity';
import { RdhyVamAgreement } from '../vam/rdhy-vam-agreement.entity';

@Injectable()
export class PlatformsService {
  constructor(
    @InjectRepository(RdhyPlatform)
    private readonly platformRepository: Repository<RdhyPlatform>,
    @InjectRepository(RdhyPlatformValueStream)
    private readonly linkRepository: Repository<RdhyPlatformValueStream>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(RdhyVamAgreement)
    private readonly vamAgreementRepository: Repository<RdhyVamAgreement>,
  ) {}

  async create(input: CreateRdhyPlatformInput): Promise<RdhyPlatformResponse> {
    const platform = this.platformRepository.create({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
    });
    let saved: RdhyPlatform;
    try {
      saved = await this.platformRepository.save(platform);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('RDHY platform with this code already exists');
      }
      throw error;
    }
    return this.toResponse(saved, 0);
  }

  async findAll(): Promise<RdhyPlatformResponse[]> {
    const platforms = await this.platformRepository.find({ order: { name: 'ASC' } });
    const counts = await this.memberCounts();
    return platforms.map((p) => this.toResponse(p, counts.get(p.id) ?? 0));
  }

  async findOne(id: string): Promise<RdhyPlatformDetailResponse> {
    const platform = await this.requirePlatform(id);
    const links = await this.linkRepository.find({
      where: { platformId: platform.id },
      relations: ['valueStream'],
      order: { createdAt: 'ASC' },
    });
    const members = links.map((link) => ({
      id: link.valueStream.id,
      code: link.valueStream.code,
      name: link.valueStream.name,
      level: link.valueStream.level,
    }));
    return { ...this.toResponse(platform, members.length), members };
  }

  async update(id: string, input: UpdateRdhyPlatformInput): Promise<RdhyPlatformResponse> {
    const platform = await this.requirePlatform(id);
    if (input.name !== undefined) platform.name = input.name;
    if (input.description !== undefined) platform.description = input.description ?? null;
    const saved = await this.platformRepository.save(platform);
    const count = await this.linkRepository.count({ where: { platformId: id } });
    return this.toResponse(saved, count);
  }

  async remove(id: string): Promise<void> {
    const platform = await this.requirePlatform(id);
    // Agreements are contracts: block deletion while any exist (the FK's
    // ON DELETE RESTRICT is the backstop). Membership link rows still cascade.
    const sponsored = await this.vamAgreementRepository.count({ where: { platformId: id } });
    if (sponsored > 0) {
      throw new ConflictException(
        `Platform sponsors ${sponsored} VAM agreement(s) and cannot be deleted`,
      );
    }
    await this.platformRepository.remove(platform);
  }

  async assign(
    valueStreamId: string,
    input: AssignRdhyPlatformInput,
  ): Promise<RdhyPlatformLookupResponse> {
    await this.requireValueStream(valueStreamId);
    const platform = await this.requirePlatform(input.platformId);

    const existing = await this.linkRepository.findOne({ where: { valueStreamId } });
    if (existing) {
      existing.platformId = platform.id;
      await this.linkRepository.save(existing);
    } else {
      await this.linkRepository.save(
        this.linkRepository.create({ valueStreamId, platformId: platform.id }),
      );
    }
    return { platform: { id: platform.id, code: platform.code, name: platform.name } };
  }

  async detach(valueStreamId: string): Promise<void> {
    await this.requireValueStream(valueStreamId);
    const link = await this.linkRepository.findOne({ where: { valueStreamId } });
    if (link) await this.linkRepository.remove(link);
  }

  async platformOf(valueStreamId: string): Promise<RdhyPlatformLookupResponse> {
    await this.requireValueStream(valueStreamId);
    const link = await this.linkRepository.findOne({
      where: { valueStreamId },
      relations: ['platform'],
    });
    if (!link) return { platform: null };
    return {
      platform: { id: link.platform.id, code: link.platform.code, name: link.platform.name },
    };
  }

  private async requirePlatform(id: string): Promise<RdhyPlatform> {
    const platform = await this.platformRepository.findOne({ where: { id } });
    if (!platform) throw new NotFoundException('RDHY platform not found');
    return platform;
  }

  private async requireValueStream(id: string): Promise<ValueStream> {
    const valueStream = await this.valueStreamRepository.findOne({ where: { id } });
    if (!valueStream) throw new NotFoundException('Value stream not found');
    return valueStream;
  }

  private async memberCounts(): Promise<Map<string, number>> {
    const rows: Array<{ platformId: string; count: string }> = await this.linkRepository
      .createQueryBuilder('link')
      .select('link.platformId', 'platformId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('link.platformId')
      .getRawMany();
    return new Map(rows.map((row) => [row.platformId, Number(row.count)]));
  }

  private toResponse(platform: RdhyPlatform, memberCount: number): RdhyPlatformResponse {
    return {
      id: platform.id,
      code: platform.code,
      name: platform.name,
      description: platform.description,
      memberCount,
      createdAt: platform.createdAt.toISOString(),
      updatedAt: platform.updatedAt.toISOString(),
    };
  }
}
