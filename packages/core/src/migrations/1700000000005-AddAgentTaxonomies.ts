import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentTaxonomies1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agents" ADD "mainTaxonomyId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_agents_main_taxonomy" FOREIGN KEY ("mainTaxonomyId") REFERENCES "taxonomies"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE "agent_taxonomies" ("agentId" uuid NOT NULL, "taxonomyId" uuid NOT NULL, CONSTRAINT "PK_agent_taxonomies" PRIMARY KEY ("agentId", "taxonomyId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agent_taxonomies_agent" ON "agent_taxonomies" ("agentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_agent_taxonomies_taxonomy" ON "agent_taxonomies" ("taxonomyId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_taxonomies" ADD CONSTRAINT "FK_agent_taxonomies_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_taxonomies" ADD CONSTRAINT "FK_agent_taxonomies_taxonomy" FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_taxonomies" DROP CONSTRAINT "FK_agent_taxonomies_taxonomy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_taxonomies" DROP CONSTRAINT "FK_agent_taxonomies_agent"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_agent_taxonomies_taxonomy"`);
    await queryRunner.query(`DROP INDEX "IDX_agent_taxonomies_agent"`);
    await queryRunner.query(`DROP TABLE "agent_taxonomies"`);
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_agents_main_taxonomy"`,
    );
    await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "mainTaxonomyId"`);
  }
}
