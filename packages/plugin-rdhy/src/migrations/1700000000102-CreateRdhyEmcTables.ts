import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRdhyEmcTables1700000000102 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_emc_agreements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'DRAFT',
        "collaborativeScenario" text,
        "collaborativeGoals" text,
        "governanceModel" text,
        "reinvestmentPercent" numeric(5,2),
        "investmentNote" text,
        "platformId" uuid NOT NULL,
        "agreementId" uuid,
        "currencyId" uuid,
        "startedAt" TIMESTAMP,
        "endedAt" TIMESTAMP,
        "citedTerminationConditionId" uuid,
        "terminationNote" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_rdhy_emc_agreements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_emc_agr_platform" FOREIGN KEY ("platformId")
          REFERENCES "plugin_rdhy_platforms"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_plugin_rdhy_emc_agr_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "agreements"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_plugin_rdhy_emc_agr_currency" FOREIGN KEY ("currencyId")
          REFERENCES "values"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_agr_platform" ON "plugin_rdhy_emc_agreements" ("platformId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_emc_nodes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementId" uuid NOT NULL,
        "valueStreamId" uuid NOT NULL,
        "tier" character varying(16) NOT NULL,
        "isLeading" boolean NOT NULL DEFAULT false,
        "profitSharePercent" numeric(5,2),
        "position" integer NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_emc_nodes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plugin_rdhy_emc_node_value_stream" UNIQUE ("agreementId", "valueStreamId"),
        CONSTRAINT "FK_plugin_rdhy_emc_node_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "plugin_rdhy_emc_agreements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plugin_rdhy_emc_node_value_stream" FOREIGN KEY ("valueStreamId")
          REFERENCES "value_streams"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_node_agreement" ON "plugin_rdhy_emc_nodes" ("agreementId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_node_value_stream" ON "plugin_rdhy_emc_nodes" ("valueStreamId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_emc_exposed_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nodeId" uuid NOT NULL,
        "position" integer NOT NULL,
        "text" text NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_emc_exposed_services" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_emc_service_node" FOREIGN KEY ("nodeId")
          REFERENCES "plugin_rdhy_emc_nodes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_service_node" ON "plugin_rdhy_emc_exposed_services" ("nodeId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_emc_leading_goals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nodeId" uuid NOT NULL,
        "position" integer NOT NULL,
        "text" text NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_emc_leading_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_emc_goal_node" FOREIGN KEY ("nodeId")
          REFERENCES "plugin_rdhy_emc_nodes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_goal_node" ON "plugin_rdhy_emc_leading_goals" ("nodeId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_emc_cost_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nodeId" uuid NOT NULL,
        "label" character varying NOT NULL,
        "amount" numeric(14,4) NOT NULL,
        "headcount" integer,
        "position" integer NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_emc_cost_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_emc_cost_node" FOREIGN KEY ("nodeId")
          REFERENCES "plugin_rdhy_emc_nodes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_cost_node" ON "plugin_rdhy_emc_cost_entries" ("nodeId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plugin_rdhy_emc_termination_conditions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementId" uuid NOT NULL,
        "position" integer NOT NULL,
        "text" text NOT NULL,
        CONSTRAINT "PK_plugin_rdhy_emc_termination_conditions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plugin_rdhy_emc_term_agreement" FOREIGN KEY ("agreementId")
          REFERENCES "plugin_rdhy_emc_agreements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_rdhy_emc_term_agreement" ON "plugin_rdhy_emc_termination_conditions" ("agreementId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plugin_rdhy_emc_termination_conditions"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_emc_cost_entries"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_emc_leading_goals"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_emc_exposed_services"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_emc_nodes"`);
    await queryRunner.query(`DROP TABLE "plugin_rdhy_emc_agreements"`);
  }
}
