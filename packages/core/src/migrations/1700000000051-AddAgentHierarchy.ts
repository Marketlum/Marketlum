import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentHierarchy1700000000051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agents" ADD COLUMN "parentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "agents" ADD COLUMN "level" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "agents"
        ADD CONSTRAINT "FK_agents_parent"
        FOREIGN KEY ("parentId") REFERENCES "agents"("id") ON DELETE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_agents_parent" ON "agents" ("parentId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "agents_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_agents_closure" PRIMARY KEY ("id_ancestor", "id_descendant"),
        CONSTRAINT "FK_agents_closure_ancestor" FOREIGN KEY ("id_ancestor")
          REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agents_closure_descendant" FOREIGN KEY ("id_descendant")
          REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_agents_closure_ancestor" ON "agents_closure" ("id_ancestor")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agents_closure_descendant" ON "agents_closure" ("id_descendant")`,
    );

    // Existing agents become roots; closure self-rows are required for
    // TypeORM tree queries to see them at all.
    await queryRunner.query(`
      INSERT INTO "agents_closure" ("id_ancestor", "id_descendant")
        SELECT "id", "id" FROM "agents"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "agents_closure"`);
    await queryRunner.query(`DROP INDEX "IDX_agents_parent"`);
    await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_agents_parent"`);
    await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "level"`);
    await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "parentId"`);
  }
}
