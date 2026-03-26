import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tension } from './entities/tension.entity';
import { Agent } from '../agents/entities/agent.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateTensionInput,
  UpdateTensionInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class TensionsService {
  constructor(
    @InjectRepository(Tension)
    private readonly tensionRepository: Repository<Tension>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(input: CreateTensionInput): Promise<Tension> {
    const { agentId, leadUserId, ...rest } = input;

    const agent = await this.agentRepository.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    if (leadUserId) {
      const user = await this.userRepository.findOne({ where: { id: leadUserId } });
      if (!user) throw new NotFoundException('Lead user not found');
    }

    const tension = this.tensionRepository.create({
      ...rest,
      currentContext: rest.currentContext ?? null,
      potentialFuture: rest.potentialFuture ?? null,
      score: rest.score ?? 5,
      agentId,
      leadUserId: leadUserId ?? null,
    });

    const saved = await this.tensionRepository.save(tension);
    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Tension> {
    const tension = await this.tensionRepository.findOne({
      where: { id },
      relations: ['agent', 'lead', 'exchanges'],
    });
    if (!tension) {
      throw new NotFoundException('Tension not found');
    }
    return tension;
  }

  async search(
    query: PaginationQuery & {
      agentId?: string;
      leadUserId?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, agentId, leadUserId } = query;
    const skip = (page - 1) * limit;

    const qb = this.tensionRepository.createQueryBuilder('tension');
    qb.leftJoinAndSelect('tension.agent', 'agent');
    qb.leftJoinAndSelect('tension.lead', 'lead');

    if (agentId) {
      qb.andWhere('tension.agentId = :agentId', { agentId });
    }

    if (leadUserId) {
      qb.andWhere('tension.leadUserId = :leadUserId', { leadUserId });
    }

    if (search) {
      qb.andWhere(
        `tension.search_vector @@ plainto_tsquery('english', :search)`,
        { search },
      );
    }

    if (sortBy) {
      qb.orderBy(`tension.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('tension.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const entities = await qb.getMany();

    const countQb = this.tensionRepository.createQueryBuilder('tension');

    if (agentId) {
      countQb.andWhere('tension.agentId = :agentId', { agentId });
    }
    if (leadUserId) {
      countQb.andWhere('tension.leadUserId = :leadUserId', { leadUserId });
    }
    if (search) {
      countQb.andWhere(
        `tension.search_vector @@ plainto_tsquery('english', :search)`,
        { search },
      );
    }

    const total = await countQb.getCount();

    return {
      data: entities,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, input: UpdateTensionInput): Promise<Tension> {
    const tension = await this.findOne(id);
    const { agentId, leadUserId, ...rest } = input;

    if (rest.name !== undefined) tension.name = rest.name;
    if (rest.currentContext !== undefined) tension.currentContext = rest.currentContext ?? null;
    if (rest.potentialFuture !== undefined) tension.potentialFuture = rest.potentialFuture ?? null;
    if (rest.score !== undefined) tension.score = rest.score;

    if (agentId !== undefined) {
      const agent = await this.agentRepository.findOne({ where: { id: agentId } });
      if (!agent) throw new NotFoundException('Agent not found');
      tension.agentId = agentId;
    }

    if (leadUserId !== undefined) {
      if (leadUserId === null) {
        tension.lead = null;
        tension.leadUserId = null;
      } else {
        const user = await this.userRepository.findOne({ where: { id: leadUserId } });
        if (!user) throw new NotFoundException('Lead user not found');
        tension.leadUserId = leadUserId;
      }
    }

    delete (tension as any).agent;
    delete (tension as any).lead;
    delete (tension as any).exchanges;
    await this.tensionRepository.save(tension);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const tension = await this.tensionRepository.findOne({ where: { id } });
    if (!tension) {
      throw new NotFoundException('Tension not found');
    }
    await this.tensionRepository.remove(tension);
  }
}
