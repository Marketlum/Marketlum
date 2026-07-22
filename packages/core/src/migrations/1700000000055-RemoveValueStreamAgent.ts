import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveValueStreamAgent1700000000055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "value_streams" DROP CONSTRAINT IF EXISTS "FK_value_streams_agent"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_value_streams_agent"`);
    await queryRunner.query(`ALTER TABLE "value_streams" DROP COLUMN "agentId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "value_streams" ADD COLUMN "agentId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "value_streams"
        ADD CONSTRAINT "FK_value_streams_agent"
        FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_value_streams_agent" ON "value_streams" ("agentId")`,
    );
  }
}
