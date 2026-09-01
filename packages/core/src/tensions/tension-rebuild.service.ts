import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TENSION_AGGREGATE_TYPE, TensionEventType } from '@marketlum/shared';
import { EventStore } from '../events/store/event-store.service';
import { TensionProjector } from './tension.projector';
import { reconstitute, type TensionAggregateState, type TensionStreamEvent } from './tension.reducer';

export interface TensionRebuildReport {
  streamsReplayed: number;
  inserted: number;
  updated: number;
  unchanged: number;
  deleted: number;
  /** Projection rows with no stream — they were written outside the command path. */
  orphanRowIds: string[];
  executed: boolean;
}

interface ProjectionRow {
  id: string;
  name: string;
  currentContext: string | null;
  potentialFuture: string | null;
  score: number;
  state: string;
  actorId: string;
  leadUserId: string | null;
  version: number;
}

/**
 * Replays every tension stream and reconciles the projection in place
 * (spec 027 §4.1). Never truncates: `exchanges.tensionId` references
 * `tensions`, so a truncate would silently sever those links.
 */
@Injectable()
export class TensionRebuildService {
  private readonly logger = new Logger('TensionRebuild');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventStore: EventStore,
    private readonly projector: TensionProjector,
  ) {}

  async rebuild(options: { execute: boolean } = { execute: false }): Promise<TensionRebuildReport> {
    const report: TensionRebuildReport = {
      streamsReplayed: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      deleted: 0,
      orphanRowIds: [],
      executed: options.execute,
    };

    const aggregateIds = await this.eventStore.listAggregateIds(TENSION_AGGREGATE_TYPE);
    const existing = await this.loadProjection();
    const seen = new Set<string>();

    for (const aggregateId of aggregateIds) {
      seen.add(aggregateId);
      report.streamsReplayed += 1;

      const stored = await this.eventStore.readStream(TENSION_AGGREGATE_TYPE, aggregateId);
      const events: TensionStreamEvent[] = stored.map((e) => ({
        type: e.type as TensionEventType,
        payload: e.payload,
        version: e.version,
        occurredAt: e.occurredAt,
      }));
      const state = reconstitute(aggregateId, events);
      const row = existing.get(aggregateId);

      if (!state || state.discarded) {
        if (row) {
          report.deleted += 1;
          if (options.execute) await this.write(aggregateId, null);
        } else {
          report.unchanged += 1;
        }
        continue;
      }

      if (!row) {
        report.inserted += 1;
        if (options.execute) await this.write(aggregateId, state);
      } else if (this.differs(row, state)) {
        report.updated += 1;
        if (options.execute) await this.write(aggregateId, state);
      } else {
        report.unchanged += 1;
      }
    }

    // Rows with no stream at all: something wrote to `tensions` outside the
    // command path. Report loudly, then remove them so the projection matches
    // the record of truth.
    for (const id of existing.keys()) {
      if (seen.has(id)) continue;
      report.orphanRowIds.push(id);
      report.deleted += 1;
      this.logger.warn(`Projection row ${id} has no event stream — it will be deleted.`);
      if (options.execute) await this.write(id, null);
    }

    return report;
  }

  private async write(aggregateId: string, state: TensionAggregateState | null): Promise<void> {
    await this.dataSource.transaction((manager) =>
      this.projector.apply(manager, aggregateId, state),
    );
  }

  private async loadProjection(): Promise<Map<string, ProjectionRow>> {
    const rows: ProjectionRow[] = await this.dataSource.query(
      `SELECT "id", "name", "currentContext", "potentialFuture", "score", "state",
              "actorId", "leadUserId", "version"
       FROM "tensions"`,
    );
    return new Map(rows.map((r) => [r.id, { ...r, score: Number(r.score), version: Number(r.version) }]));
  }

  private differs(row: ProjectionRow, state: TensionAggregateState): boolean {
    return (
      row.name !== state.name ||
      row.currentContext !== state.currentContext ||
      row.potentialFuture !== state.potentialFuture ||
      row.score !== state.score ||
      row.state !== state.state ||
      row.actorId !== state.actorId ||
      row.leadUserId !== state.leadUserId ||
      row.version !== state.version
    );
  }
}
