import { Injectable } from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Agent } from './entities/agent.entity';

import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

export interface AgentFilterOptions {
  geographyId?: string;
}

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {}

  async create(createAgentDto: CreateAgentDto) {
    const agent = this.agentRepository.create(createAgentDto);

    return this.agentRepository.save(agent);
  }

  update(id: string, updateAgentDto: UpdateAgentDto) {
    return this.agentRepository.update(id, updateAgentDto);
  }

  async paginate(
    options: IPaginationOptions,
    filters?: AgentFilterOptions,
  ): Promise<Pagination<Agent>> {
    const queryBuilder = this.agentRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.geography', 'geography')
      .orderBy('agent.createdAt', 'DESC');

    if (filters?.geographyId) {
      queryBuilder.andWhere('agent.geographyId = :geographyId', {
        geographyId: filters.geographyId,
      });
    }

    return paginate<Agent>(queryBuilder, options);
  }

  findOne(id: string): Promise<Agent | null> {
    return this.agentRepository.findOne({
      where: { id },
      relations: ['geography'],
    });
  }

  async findAllWithCoordinates(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        latitude: Not(IsNull()),
        longitude: Not(IsNull()),
      },
      relations: ['geography'],
      order: { name: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    await this.agentRepository.delete(id);
  }
}
