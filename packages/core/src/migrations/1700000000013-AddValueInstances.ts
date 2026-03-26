import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValueInstances1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "value_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "purpose" text,
        "description" text,
        "link" text,
        "version" character varying,
        "expiresAt" TIMESTAMP,
        "valueId" uuid NOT NULL,
        "fromAgentId" uuid,
        "toAgentId" uuid,
        "imageId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_value_instances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_value_instances_value" FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_value_instances_fromAgent" FOREIGN KEY ("fromAgentId") REFERENCES "agents"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_value_instances_toAgent" FOREIGN KEY ("toAgentId") REFERENCES "agents"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_value_instances_image" FOREIGN KEY ("imageId") REFERENCES "files"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_value_instances_valueId" ON "value_instances" ("valueId")`);
    await queryRunner.query(`CREATE INDEX "IDX_value_instances_fromAgentId" ON "value_instances" ("fromAgentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_value_instances_toAgentId" ON "value_instances" ("toAgentId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "value_instances"`);
  }
}
