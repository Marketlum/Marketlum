import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreementTemplates1700000000028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create agreement_template_type enum
    await queryRunner.query(`
      CREATE TYPE "agreement_template_type" AS ENUM (
        'main_agreement',
        'annex',
        'schedule',
        'exhibit'
      )
    `);

    // Create agreement_templates table
    await queryRunner.query(`
      CREATE TABLE "agreement_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "agreement_template_type" NOT NULL,
        "purpose" text,
        "description" text,
        "link" text,
        "level" integer NOT NULL DEFAULT 0,
        "parentId" uuid,
        "valueStreamId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agreement_templates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agreement_templates_name" UNIQUE ("name")
      )
    `);

    // Create closure table
    await queryRunner.query(`
      CREATE TABLE "agreement_templates_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_agreement_templates_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    // Foreign key for tree parent
    await queryRunner.query(`
      ALTER TABLE "agreement_templates"
      ADD CONSTRAINT "FK_agreement_templates_parent"
      FOREIGN KEY ("parentId") REFERENCES "agreement_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Foreign key for value stream
    await queryRunner.query(`
      ALTER TABLE "agreement_templates"
      ADD CONSTRAINT "FK_agreement_templates_value_stream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Foreign keys for closure table
    await queryRunner.query(`
      ALTER TABLE "agreement_templates_closure"
      ADD CONSTRAINT "FK_agreement_templates_closure_ancestor"
      FOREIGN KEY ("id_ancestor") REFERENCES "agreement_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "agreement_templates_closure"
      ADD CONSTRAINT "FK_agreement_templates_closure_descendant"
      FOREIGN KEY ("id_descendant") REFERENCES "agreement_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_templates_closure_ancestor" ON "agreement_templates_closure" ("id_ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_templates_closure_descendant" ON "agreement_templates_closure" ("id_descendant")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_templates_name" ON "agreement_templates" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_templates_type" ON "agreement_templates" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreement_templates_value_stream" ON "agreement_templates" ("valueStreamId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_templates_value_stream"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_templates_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_templates_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_templates_closure_descendant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreement_templates_closure_ancestor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agreement_templates_closure"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agreement_templates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agreement_template_type"`);
  }
}
