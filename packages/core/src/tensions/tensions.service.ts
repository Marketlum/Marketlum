import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tension } from './entities/tension.entity';
import { Actor } from '../actors/entities/actor.entity';
import { PaginationQuery } from '@marketlum/shared';

/**
 * Read side of the event-sourced Tension aggregate (spec 027).
 *
 * All writes go through the command bus — `create`, `update`, `transition` and
 * `remove` were removed in spec 027. This service only reads the projection.
 */
@Injectable()
export class TensionsService {
  constructor(
    @InjectRepository(Tension)
    private readonly tensionRepository: Repository<Tension>,
    @InjectRepository(Actor)
    private readonly actorRepository: Repository<Actor>,
  ) {}

  async findOne(id: string): Promise<Tension> {
    const tension = await this.tensionRepository.findOne({
      where: { id },
      relations: ['actor', 'lead', 'exchanges'],
    });
    if (!tension) {
      throw new NotFoundException('Tension not found');
    }
    // Load actor image separately (nested relation loading is unreliable)
    if (tension.actor) {
      const actorWithImage = await this.actorRepository.findOne({
        where: { id: tension.actorId },
        relations: ['image'],
      });
      if (actorWithImage) {
        tension.actor.image = actorWithImage.image;
      }
    }
    return tension;
  }

  async search(
    query: PaginationQuery & {
      actorId?: string;
      leadUserId?: string;
      state?: string;
    },
  ) {
    const { page, limit, search, sortBy, sortOrder, actorId, leadUserId, state } = query;
    const skip = (page - 1) * limit;

    const qb = this.tensionRepository.createQueryBuilder('tension');
    qb.leftJoinAndSelect('tension.actor', 'actor');
    qb.leftJoinAndSelect('tension.lead', 'lead');

    if (actorId) {
      qb.andWhere('tension.actorId = :actorId', { actorId });
    }

    if (leadUserId) {
      qb.andWhere('tension.leadUserId = :leadUserId', { leadUserId });
    }

    if (state) {
      qb.andWhere('tension.state = :state', { state });
    }

    if (search) {
      qb.andWhere(`tension.search_vector @@ plainto_tsquery('english', :search)`, { search });
    }

    if (sortBy) {
      qb.orderBy(`tension.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('tension.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const entities = await qb.getMany();

    // Batch-load actor images (nested join not hydrated by getMany)
    const actorIds = [...new Set(entities.map((t) => t.actorId))];
    if (actorIds.length > 0) {
      const actorsWithImages = await this.actorRepository.find({
        where: { id: In(actorIds) },
        relations: ['image'],
      });
      const actorMap = new Map(actorsWithImages.map((a) => [a.id, a]));
      for (const tension of entities) {
        const actorWithImage = actorMap.get(tension.actorId);
        if (tension.actor && actorWithImage) {
          tension.actor.image = actorWithImage.image;
        }
      }
    }

    const countQb = this.tensionRepository.createQueryBuilder('tension');

    if (actorId) {
      countQb.andWhere('tension.actorId = :actorId', { actorId });
    }
    if (leadUserId) {
      countQb.andWhere('tension.leadUserId = :leadUserId', { leadUserId });
    }
    if (state) {
      countQb.andWhere('tension.state = :state', { state });
    }
    if (search) {
      countQb.andWhere(`tension.search_vector @@ plainto_tsquery('english', :search)`, { search });
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

  /** Ids of every tension owned by an actor — drives the deletion cascade (Q7). */
  async findIdsByActor(actorId: string): Promise<string[]> {
    const rows = await this.tensionRepository.find({
      where: { actorId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
