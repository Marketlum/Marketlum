import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditActorKind,
  TENSION_AGGREGATE_TYPE,
  TensionEventType,
  type PaginationQuery,
  type TensionHistoryEntry,
} from '@marketlum/shared';
import { DomainEvent } from '../events/store/domain-event.entity';

interface RenderedSummary {
  summary: string;
  summaryKey: string;
  summaryParams: Record<string, string | number | null>;
}

/**
 * Renders a tension's event stream as a timeline (spec 027 §5.1).
 *
 * Each entry carries an English `summary` — always present, so API and MCP
 * consumers get a readable line — plus `summaryKey` and `summaryParams` so the
 * next-intl UI can localise the same entry. The UI therefore never has to
 * inspect `payload` to decide what to render.
 */
@Injectable()
export class TensionHistoryService {
  constructor(
    @InjectRepository(DomainEvent)
    private readonly events: Repository<DomainEvent>,
  ) {}

  async findForTension(
    tensionId: string,
    query: PaginationQuery,
  ): Promise<{ data: TensionHistoryEntry[]; meta: Record<string, number> }> {
    const { page, limit } = query;

    const total = await this.events.count({
      where: { aggregateType: TENSION_AGGREGATE_TYPE, aggregateId: tensionId },
    });
    // An id with no stream never existed — discarded tensions keep their
    // history readable, which is the point of retaining the stream (Q6).
    if (total === 0) throw new NotFoundException('Tension not found');

    const rows = await this.events.find({
      where: { aggregateType: TENSION_AGGREGATE_TYPE, aggregateId: tensionId },
      order: { version: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((row) => this.toEntry(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private toEntry(row: DomainEvent): TensionHistoryEntry {
    const type = row.type as TensionEventType;
    const rendered = this.render(type, row.payload);
    return {
      version: row.version,
      type,
      occurredAt: row.occurredAt.toISOString(),
      actor: {
        kind: row.actorKind as AuditActorKind,
        userId: row.userId,
        userName: row.userName,
        apiKeyName: row.apiKeyName,
      },
      ...rendered,
      payload: row.payload,
    };
  }

  private render(type: TensionEventType, payload: Record<string, unknown>): RenderedSummary {
    switch (type) {
      case TensionEventType.SENSED:
        return {
          summary: 'Tension sensed',
          summaryKey: 'history.sensed',
          summaryParams: {},
        };

      case TensionEventType.RENAMED: {
        const from = String(payload.previousName ?? '');
        const to = String(payload.name ?? '');
        return {
          summary: `Renamed from "${from}" to "${to}"`,
          summaryKey: 'history.renamed',
          summaryParams: { from, to },
        };
      }

      case TensionEventType.RESCORED: {
        const from = Number(payload.previousScore);
        const to = Number(payload.score);
        const raised = to > from;
        return {
          summary: `Score ${raised ? 'raised' : 'lowered'} from ${from} to ${to}`,
          summaryKey: raised ? 'history.rescored.raised' : 'history.rescored.lowered',
          summaryParams: { from, to },
        };
      }

      case TensionEventType.CONTEXT_REVISED: {
        const fields: string[] = [];
        if ('currentContext' in payload) fields.push('current context');
        if ('potentialFuture' in payload) fields.push('potential future');
        const list = fields.join(' and ');
        return {
          summary: `Revised ${list}`,
          summaryKey: 'history.contextRevised',
          summaryParams: { fields: list, count: fields.length },
        };
      }

      case TensionEventType.LEAD_ASSIGNED:
        return {
          summary: 'Lead assigned',
          summaryKey: 'history.leadAssigned',
          summaryParams: { leadUserId: String(payload.leadUserId ?? '') },
        };

      case TensionEventType.LEAD_UNASSIGNED:
        return {
          summary: 'Lead unassigned',
          summaryKey: 'history.leadUnassigned',
          summaryParams: {},
        };

      case TensionEventType.REASSIGNED:
        return {
          summary: 'Reassigned to a different actor',
          summaryKey: 'history.reassigned',
          summaryParams: { actorId: String(payload.actorId ?? '') },
        };

      case TensionEventType.RESOLVED:
        return { summary: 'Resolved', summaryKey: 'history.resolved', summaryParams: {} };

      case TensionEventType.DROPPED:
        return { summary: 'Dropped as stale', summaryKey: 'history.dropped', summaryParams: {} };

      case TensionEventType.REOPENED:
        return { summary: 'Reopened', summaryKey: 'history.reopened', summaryParams: {} };

      case TensionEventType.REVIVED:
        return { summary: 'Revived', summaryKey: 'history.revived', summaryParams: {} };

      case TensionEventType.DISCARDED:
        return { summary: 'Discarded', summaryKey: 'history.discarded', summaryParams: {} };
    }
  }
}
