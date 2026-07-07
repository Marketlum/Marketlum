import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRdhyVamTables1700000000101 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_vam_agreements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "horizonMonths" integer NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'DRAFT',
        "valueStreamId" uuid NOT NULL,
        "platformId" uuid NOT NULL,
        "agreementId" uuid,
        "currencyId" uuid,
        "startedAt" TIMESTAMP,
        "endedAt" TIMESTAMP,
        "citedTerminationConditionId" uuid,
        "terminationNote" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_rdhy_vam_agreements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_vam_agr_value_stream" FOREIGN KEY ("valueStreamId")
          REFERENCES "value_streams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plugin_rdhy_vam_agr_platform" FOREIGN KEY ("platformId")
          REFERENCES "plugin_rdhy_platforms"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_plugin_rdhy_vam_agr_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "agreements"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_plugin_rdhy_vam_agr_currency" FOREIGN KEY ("currencyId")
          REFERENCES "values"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_agr_value_stream" ON "plugin_rdhy_vam_agreements" ("valueStreamId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_agr_platform" ON "plugin_rdhy_vam_agreements" ("platformId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_vam_milestones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementId" uuid NOT NULL,
        "offsetMonths" integer NOT NULL,
        "label" character varying(255),
        "position" integer NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_vam_milestones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plugin_rdhy_vam_milestone_offset" UNIQUE ("agreementId", "offsetMonths"),
        CONSTRAINT "FK_plugin_rdhy_vam_milestone_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "plugin_rdhy_vam_agreements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_milestone_agreement" ON "plugin_rdhy_vam_milestones" ("agreementId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_vam_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "milestoneId" uuid NOT NULL,
        "track" character varying(32) NOT NULL,
        "description" text NOT NULL,
        "amount" numeric(14,4),
        "position" integer NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_vam_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_vam_item_milestone" FOREIGN KEY ("milestoneId")
          REFERENCES "plugin_rdhy_vam_milestones"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_item_milestone" ON "plugin_rdhy_vam_items" ("milestoneId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_vam_cost_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementId" uuid NOT NULL,
        "category" character varying(32) NOT NULL,
        "label" character varying NOT NULL,
        "amount" numeric(14,4) NOT NULL,
        "headcount" integer,
        "position" integer NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_vam_cost_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_vam_cost_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "plugin_rdhy_vam_agreements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_cost_agreement" ON "plugin_rdhy_vam_cost_entries" ("agreementId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_vam_investment_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementId" uuid NOT NULL,
        "kind" character varying(32) NOT NULL,
        "label" character varying(255),
        "amount" numeric(14,4) NOT NULL,
        "position" integer NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_vam_investment_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_vam_inv_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "plugin_rdhy_vam_agreements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_inv_agreement" ON "plugin_rdhy_vam_investment_entries" ("agreementId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_vam_termination_conditions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementId" uuid NOT NULL,
        "position" integer NOT NULL,
        "text" text NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_vam_termination_conditions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_vam_term_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "plugin_rdhy_vam_agreements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_vam_term_agreement" ON "plugin_rdhy_vam_termination_conditions" ("agreementId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plugin_rdhy_vam_termination_conditions"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_vam_investment_entries"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_vam_cost_entries"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_vam_items"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_vam_milestones"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_vam_agreements"`);
  }
}
