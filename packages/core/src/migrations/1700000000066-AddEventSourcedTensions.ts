import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec 027 — converts Tensions from CRUD to event sourcing.
 *
 * Creates the generic `domain_events` store (Tensions-only usage for now, but
 * the schema is shaped for Exchanges/Orders/Invoices later), demotes `tensions`
 * to a projection by adding its stream-head `version`, backfills a synthetic
 * genesis stream for every existing row (Q23), and closes the silent
 * actor-deletion cascade by moving the actor FK to RESTRICT (Q7).
 *
 * Hand-written rather than generated: `migration:generate` drags in unrelated
 * enum-rename drift artefacts on this schema.
 */
export class AddEventSourcedTensions1700000000066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. the event store ------------------------------------------------
    // No FKs by design: attribution is denormalised so rows survive user and
    // API-key deletion, exactly as audit_logs does (spec 026 Q8). Reuses the
    // audit_actor_kind_enum created by migration 065.
    await queryRunner.query(`
      CREATE TABLE "domain_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sequence" bigserial NOT NULL,
        "aggregateType" character varying(64) NOT NULL,
        "aggregateId" uuid NOT NULL,
        "version" integer NOT NULL,
        "type" character varying(64) NOT NULL,
        "schemaVersion" integer NOT NULL DEFAULT 1,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "occurredAt" timestamptz NOT NULL DEFAULT now(),
        "correlationId" uuid,
        "causationId" uuid,
        "actorKind" "audit_actor_kind_enum" NOT NULL,
        "userId" uuid,
        "userEmail" character varying,
        "userName" character varying,
        "apiKeyId" uuid,
        "apiKeyName" character varying,
        "ip" character varying,
        "userAgent" character varying,
        CONSTRAINT "PK_domain_events" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_domain_events_stream_version"
          UNIQUE ("aggregateType", "aggregateId", "version")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_domain_events_stream" ON "domain_events" ("aggregateType", "aggregateId", "version")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_domain_events_sequence" ON "domain_events" ("sequence")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_domain_events_correlation" ON "domain_events" ("correlationId")`,
    );

    // --- 2. the projection gains its stream head ---------------------------
    await queryRunner.query(
      `ALTER TABLE "tensions" ADD COLUMN "version" integer NOT NULL DEFAULT 0`,
    );

    // --- 3. genesis backfill (Q23) -----------------------------------------
    // Every pre-existing row gets a replayable stream. History is honestly
    // thin — one TensionSensed carrying the row as it stands, plus a
    // state-establishing event where the row is not alive.
    await queryRunner.query(`
      INSERT INTO "domain_events"
        ("aggregateType", "aggregateId", "version", "type", "schemaVersion",
         "payload", "occurredAt", "actorKind")
      SELECT
        'tension', t."id", 1, 'TensionSensed', 1,
        jsonb_build_object(
          'name',            t."name",
          'currentContext',  t."currentContext",
          'potentialFuture', t."potentialFuture",
          'score',           t."score",
          'actorId',         t."actorId",
          'leadUserId',      t."leadUserId"
        ),
        t."createdAt",
        'system'::"audit_actor_kind_enum"
      FROM "tensions" t
    `);
    await queryRunner.query(`
      INSERT INTO "domain_events"
        ("aggregateType", "aggregateId", "version", "type", "schemaVersion",
         "payload", "occurredAt", "actorKind")
      SELECT
        'tension', t."id", 2,
        CASE WHEN t."state" = 'resolved' THEN 'TensionResolved' ELSE 'TensionDropped' END,
        1, '{}'::jsonb, t."updatedAt",
        'system'::"audit_actor_kind_enum"
      FROM "tensions" t
      WHERE t."state" <> 'alive'
    `);
    await queryRunner.query(
      `UPDATE "tensions" SET "version" = CASE WHEN "state" = 'alive' THEN 1 ELSE 2 END`,
    );

    // --- 4. close the silent cascade (Q7) ----------------------------------
    // With RESTRICT the database can no longer delete tensions behind the
    // event store's back; ActorsService.remove() discards them via commands.
    await queryRunner.query(`ALTER TABLE "tensions" DROP CONSTRAINT "FK_tensions_actor"`);
    await queryRunner.query(`
      ALTER TABLE "tensions" ADD CONSTRAINT "FK_tensions_actor"
        FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tensions" DROP CONSTRAINT "FK_tensions_actor"`);
    await queryRunner.query(`
      ALTER TABLE "tensions" ADD CONSTRAINT "FK_tensions_actor"
        FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`ALTER TABLE "tensions" DROP COLUMN "version"`);
    // The synthetic events go with it — they did not exist before this migration.
    await queryRunner.query(`DROP TABLE "domain_events"`);
  }
}
