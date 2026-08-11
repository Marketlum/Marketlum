import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  AuditActorKind,
  AuditCategory,
  AuditLogsQuery,
  PaginationQuery,
  UserType,
} from '@marketlum/shared';
import { AuditLog } from './entities/audit-log.entity';
import { AuditContext } from './audit-context';
import { User } from '../users/entities/user.entity';

interface RecordOverrides {
  entityType?: string | null;
  entityId?: string | null;
  action: string;
  context?: Record<string, unknown>;
  /** Explicit actor (auth events know the user before a session exists). */
  user?: Pick<User, 'id' | 'email' | 'name' | 'type'> | null;
  anonymous?: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditTrail');

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /** Post-commit best-effort (spec 026 Q9): failures log loudly, never throw. */
  async record(category: AuditCategory, overrides: RecordOverrides): Promise<void> {
    try {
      const ctx = AuditContext.get();
      const user = overrides.user;

      let actorKind = AuditActorKind.SYSTEM;
      let userId: string | null = null;
      let userEmail: string | null = null;
      let userName: string | null = null;

      if (user) {
        actorKind = user.type === UserType.AGENT ? AuditActorKind.AGENT : AuditActorKind.HUMAN;
        userId = user.id;
        userEmail = user.email;
        userName = user.name;
      } else if (!overrides.anonymous && ctx?.userId) {
        actorKind = ctx.userType === UserType.AGENT ? AuditActorKind.AGENT : AuditActorKind.HUMAN;
        userId = ctx.userId;
        userEmail = ctx.userEmail ?? null;
        userName = ctx.userName ?? null;
      }

      await this.auditRepository.insert({
        category,
        actorKind,
        userId,
        userEmail,
        userName,
        apiKeyId: ctx?.apiKeyId ?? null,
        apiKeyName: ctx?.apiKeyName ?? null,
        entityType: overrides.entityType ?? null,
        entityId: overrides.entityId ?? null,
        action: overrides.action,
        // TypeORM's QueryDeepPartialEntity mishandles free-form jsonb records.
        context: (overrides.context ?? {}) as never,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit entry (${category}/${overrides.action})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async recordMcpCall(
    tool: string,
    args: Record<string, unknown>,
    outcome: 'ok' | 'error',
    errorCode?: string,
  ): Promise<void> {
    await this.record(AuditCategory.MCP_CALL, {
      action: tool,
      context: { arguments: args, outcome, ...(errorCode ? { errorCode } : {}) },
    });
  }

  async findAll(query: PaginationQuery & AuditLogsQuery) {
    const { page, limit, search, actorKind, category, userId, entityType, entityId, from, to } =
      query;

    const qb = this.auditRepository.createQueryBuilder('log');
    if (actorKind) qb.andWhere('log."actorKind" = :actorKind', { actorKind });
    if (category) qb.andWhere('log.category = :category', { category });
    if (userId) qb.andWhere('log."userId" = :userId', { userId });
    if (entityType) qb.andWhere('log."entityType" = :entityType', { entityType });
    if (entityId) qb.andWhere('log."entityId" = :entityId', { entityId });
    if (from) qb.andWhere('log."createdAt" >= :from', { from });
    if (to) qb.andWhere('log."createdAt" <= :to', { to });
    if (search) {
      qb.andWhere(
        '(log."userEmail" ILIKE :search OR log."userName" ILIKE :search OR log."entityId"::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    qb.orderBy('log."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Distinct entity types present in the trail — feeds the UI filter (incl. plugin entities). */
  async entityTypes(): Promise<string[]> {
    const rows: { entityType: string }[] = await this.auditRepository
      .createQueryBuilder('log')
      .select('DISTINCT log."entityType"', 'entityType')
      .where('log."entityType" IS NOT NULL')
      .orderBy('"entityType"', 'ASC')
      .getRawMany();
    return rows.map((r) => r.entityType);
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditRepository.findOne({ where: { id } });
  }

  /** For the prune command: count/delete entries older than a date. */
  async countBefore(before: Date): Promise<number> {
    return this.auditRepository
      .createQueryBuilder('log')
      .where('log."createdAt" < :before', { before })
      .getCount();
  }

  async pruneBefore(before: Date): Promise<number> {
    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('"createdAt" < :before', { before })
      .execute();
    return result.affected ?? 0;
  }
}
