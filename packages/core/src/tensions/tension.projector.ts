import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type { TensionAggregateState } from './tension.reducer';

/**
 * Writes the `tensions` read model from reduced stream state (spec 027 §4).
 *
 * Raw SQL rather than `manager.save()` on purpose: `@UpdateDateColumn` would
 * overwrite `updatedAt` with wall-clock time, so a rebuild could not reproduce
 * the timestamps the stream describes. The upsert still goes through normal
 * INSERT/UPDATE, so the `tensions_search_vector_trigger` fires as usual —
 * never bypass this with COPY.
 */
@Injectable()
export class TensionProjector {
  /** Applies reduced state to the projection. Null or discarded removes the row. */
  async apply(
    manager: EntityManager,
    aggregateId: string,
    state: TensionAggregateState | null,
  ): Promise<void> {
    if (!state || state.discarded) {
      await manager.query(`DELETE FROM "tensions" WHERE "id" = $1`, [aggregateId]);
      return;
    }

    await manager.query(
      `INSERT INTO "tensions"
         ("id", "name", "currentContext", "potentialFuture", "score", "state",
          "actorId", "leadUserId", "version", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6::"tensions_state_enum", $7, $8, $9, $10, $11)
       ON CONFLICT ("id") DO UPDATE SET
         "name"            = EXCLUDED."name",
         "currentContext"  = EXCLUDED."currentContext",
         "potentialFuture" = EXCLUDED."potentialFuture",
         "score"           = EXCLUDED."score",
         "state"           = EXCLUDED."state",
         "actorId"         = EXCLUDED."actorId",
         "leadUserId"      = EXCLUDED."leadUserId",
         "version"         = EXCLUDED."version",
         "createdAt"       = EXCLUDED."createdAt",
         "updatedAt"       = EXCLUDED."updatedAt"`,
      [
        aggregateId,
        state.name,
        state.currentContext,
        state.potentialFuture,
        state.score,
        state.state,
        state.actorId,
        state.leadUserId,
        state.version,
        state.createdAt,
        state.updatedAt,
      ],
    );
  }
}
