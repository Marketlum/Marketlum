import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
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
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: Repository<Taxonomy>,
  ) {}

  async create(input: CreateAgentInput): Promise<Agent> {
    const { mainTaxonomyId, taxonomyIds, ...rest } = input;

    const agent = this.agentsRepository.create(rest);

    if (mainTaxonomyId) {
      const taxonomy = await this.taxonomyRepository.findOne({
        where: { id: mainTaxonomyId },
      });
      if (!taxonomy) {
        throw new NotFoundException('Main taxonomy not found');
      }
      agent.mainTaxonomyId = mainTaxonomyId;
      agent.mainTaxonomy = taxonomy;
    }

    if (taxonomyIds && taxonomyIds.length > 0) {
      const taxonomies = await this.taxonomyRepository.find({
        where: { id: In(taxonomyIds) },
      });
      if (taxonomies.length !== taxonomyIds.length) {
        throw new NotFoundException('One or more taxonomies not found');
      }
      agent.taxonomies = taxonomies;
    } else {
      agent.taxonomies = [];
    }

    const saved = await this.agentsRepository.save(agent);
    return this.findOne(saved.id);
  }

  async findAll(query: PaginationQuery & { type?: AgentType; taxonomyId?: string }) {
    const { page, limit, search, sortBy, sortOrder, type, taxonomyId } = query;
    const skip = (page - 1) * limit;

    const qb = this.agentsRepository.createQueryBuilder('agent');

    qb.leftJoinAndSelect('agent.mainTaxonomy', 'mainTaxonomy');
    qb.leftJoinAndSelect('agent.taxonomies', 'taxonomies');

    if (type) {
      qb.andWhere('agent.type = :type', { type });
    }

    if (taxonomyId) {
      qb.andWhere(
        '(agent."mainTaxonomyId" = :taxonomyId OR EXISTS (SELECT 1 FROM agent_taxonomies at WHERE at."agentId" = agent.id AND at."taxonomyId" = :taxonomyId))',
        { taxonomyId },
      );
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
    const agent = await this.agentsRepository.findOne({
      where: { id },
      relations: ['mainTaxonomy', 'taxonomies'],
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async update(id: string, input: UpdateAgentInput): Promise<Agent> {
    const agent = await this.findOne(id);
    const { mainTaxonomyId, taxonomyIds, ...rest } = input;

    Object.assign(agent, rest);

    if (mainTaxonomyId !== undefined) {
      if (mainTaxonomyId === null) {
        agent.mainTaxonomy = null;
        agent.mainTaxonomyId = null;
      } else {
        const taxonomy = await this.taxonomyRepository.findOne({
          where: { id: mainTaxonomyId },
        });
        if (!taxonomy) {
          throw new NotFoundException('Main taxonomy not found');
        }
        agent.mainTaxonomyId = mainTaxonomyId;
        agent.mainTaxonomy = taxonomy;
      }
    }

    if (taxonomyIds !== undefined) {
      if (taxonomyIds.length === 0) {
        agent.taxonomies = [];
      } else {
        const taxonomies = await this.taxonomyRepository.find({
          where: { id: In(taxonomyIds) },
        });
        if (taxonomies.length !== taxonomyIds.length) {
          throw new NotFoundException('One or more taxonomies not found');
        }
        agent.taxonomies = taxonomies;
      }
    }

    await this.agentsRepository.save(agent);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentsRepository.remove(agent);
  }
}
