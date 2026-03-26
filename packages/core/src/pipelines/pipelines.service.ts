import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pipeline } from './entities/pipeline.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import {
  CreatePipelineInput,
  UpdatePipelineInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
  ) {}

  async create(input: CreatePipelineInput): Promise<Pipeline> {
    const { valueStreamId, ...rest } = input;

    if (valueStreamId) {
      const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
      if (!vs) throw new NotFoundException('Value stream not found');
    }

    const pipeline = this.pipelineRepository.create({
      ...rest,
      purpose: rest.purpose ?? null,
      description: rest.description ?? null,
      valueStreamId: valueStreamId ?? null,
    });

    const saved = await this.pipelineRepository.save(pipeline);
    return this.findOne(saved.id);
  }

  async search(query: PaginationQuery & { valueStreamId?: string }) {
    const { page, limit, search, sortBy, sortOrder, valueStreamId } = query;
    const skip = (page - 1) * limit;

    const qb = this.pipelineRepository.createQueryBuilder('pipeline');

    qb.leftJoinAndSelect('pipeline.valueStream', 'valueStream');

    if (valueStreamId) {
      qb.andWhere('pipeline.valueStreamId = :valueStreamId', { valueStreamId });
    }

    if (search) {
      qb.andWhere(
        '(pipeline.name ILIKE :search OR pipeline.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`pipeline.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('pipeline.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id },
      relations: ['valueStream'],
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }
    return pipeline;
  }

  async update(id: string, input: UpdatePipelineInput): Promise<Pipeline> {
    const pipeline = await this.findOne(id);
    const { valueStreamId, ...rest } = input;

    if (rest.name !== undefined) pipeline.name = rest.name;
    if (rest.purpose !== undefined) pipeline.purpose = rest.purpose ?? null;
    if (rest.description !== undefined) pipeline.description = rest.description ?? null;
    if (rest.color !== undefined) pipeline.color = rest.color;

    if (valueStreamId !== undefined) {
      if (valueStreamId === null) {
        pipeline.valueStream = null;
        pipeline.valueStreamId = null;
      } else {
        const vs = await this.valueStreamRepository.findOne({ where: { id: valueStreamId } });
        if (!vs) throw new NotFoundException('Value stream not found');
        pipeline.valueStreamId = valueStreamId;
      }
    }

    delete (pipeline as any).valueStream;
    await this.pipelineRepository.save(pipeline);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }
    await this.pipelineRepository.remove(pipeline);
  }
}
