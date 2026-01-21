import { Injectable } from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';

import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

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

  async paginate(options: IPaginationOptions): Promise<Pagination<Agent>> {
    const queryBuilder = this.agentRepository
      .createQueryBuilder('agent')
      .orderBy('agent.createdAt', 'DESC');

    return paginate<Agent>(queryBuilder, options);
  }

  findOne(id: string): Promise<Agent | null> {
    return this.agentRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.agentRepository.delete(id);
  }
}
