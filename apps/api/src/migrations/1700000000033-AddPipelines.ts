import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPipelines1700000000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pipelines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text,
        "description" text,
        "color" character varying NOT NULL,
        "valueStreamId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pipelines" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_pipelines_name" ON "pipelines" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_pipelines_valueStreamId" ON "pipelines" ("valueStreamId")`);

    await queryRunner.query(`
      ALTER TABLE "pipelines"
      ADD CONSTRAINT "FK_pipelines_value_stream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TABLE "exchanges" ADD COLUMN "pipelineId" uuid`);
    await queryRunner.query(`CREATE INDEX "IDX_exchanges_pipelineId" ON "exchanges" ("pipelineId")`);
    await queryRunner.query(`
      ALTER TABLE "exchanges"
      ADD CONSTRAINT "FK_exchanges_pipeline"
      FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exchanges" DROP CONSTRAINT "FK_exchanges_pipeline"`);
    await queryRunner.query(`DROP INDEX "IDX_exchanges_pipelineId"`);
    await queryRunner.query(`ALTER TABLE "exchanges" DROP COLUMN "pipelineId"`);

    await queryRunner.query(`ALTER TABLE "pipelines" DROP CONSTRAINT "FK_pipelines_value_stream"`);
    await queryRunner.query(`DROP INDEX "IDX_pipelines_valueStreamId"`);
    await queryRunner.query(`DROP INDEX "IDX_pipelines_name"`);
    await queryRunner.query(`DROP TABLE "pipelines"`);
  }
}
