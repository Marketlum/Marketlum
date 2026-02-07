import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Agent } from './entities/agent.entity';
import {
  CreateAgentInput,
  UpdateAgentInput,
  PaginationQuery,
  AgentType,
} from '@marketlum/shared';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
  ) {}

  async create(input: CreateAgentInput): Promise<Agent> {
    const agent = this.agentsRepository.create(input);
    return this.agentsRepository.save(agent);
  }

  async findAll(query: PaginationQuery & { type?: AgentType }) {
    const { page, limit, search, sortBy, sortOrder, type } = query;
    const skip = (page - 1) * limit;

    const qb = this.agentsRepository.createQueryBuilder('agent');

    if (type) {
      qb.andWhere('agent.type = :type', { type });
    }

    if (search) {
      qb.andWhere(
        '(agent.name ILIKE :search OR agent.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`agent.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('agent.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    const agent = await this.findOne(id);
    Object.assign(agent, input);
    return this.agentsRepository.save(agent);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentsRepository.remove(agent);
  }
}
