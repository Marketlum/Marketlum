import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditTrail1700000000065 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "audit_category_enum" AS ENUM ('mutation', 'mcp_call', 'auth')`,
    );
    await queryRunner.query(
      `CREATE TYPE "audit_actor_kind_enum" AS ENUM ('human', 'agent', 'system')`,
    );
    // No FKs by design (spec 026 Q8): entries must survive user/key deletion.
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category" "audit_category_enum" NOT NULL,
        "actorKind" "audit_actor_kind_enum" NOT NULL,
        "userId" uuid,
        "userEmail" character varying,
        "userName" character varying,
        "apiKeyId" uuid,
        "apiKeyName" character varying,
        "entityType" character varying,
        "entityId" uuid,
        "action" character varying,
        "context" jsonb NOT NULL DEFAULT '{}',
        "ip" character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actorKind" ON "audit_logs" ("actorKind")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_category" ON "audit_logs" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entityType", "entityId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_actor_kind_enum"`);
    await queryRunner.query(`DROP TYPE "audit_category_enum"`);
  }
}
