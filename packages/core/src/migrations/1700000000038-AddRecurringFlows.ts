import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurringFlows1700000000038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "recurring_flow_direction_enum" AS ENUM ('inbound', 'outbound')
    `);

    await queryRunner.query(`
      CREATE TYPE "recurring_flow_frequency_enum" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
    `);

    await queryRunner.query(`
      CREATE TYPE "recurring_flow_status_enum" AS ENUM ('draft', 'active', 'paused', 'ended')
    `);

    await queryRunner.query(`
      CREATE TABLE "recurring_flows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "valueStreamId" uuid NOT NULL,
        "counterpartyAgentId" uuid NOT NULL,
        "valueId" uuid,
        "offeringId" uuid,
        "agreementId" uuid,
        "direction" "recurring_flow_direction_enum" NOT NULL,
        "amount" numeric(14,4) NOT NULL,
        "unit" character varying(32) NOT NULL,
        "frequency" "recurring_flow_frequency_enum" NOT NULL,
        "interval" integer NOT NULL DEFAULT 1,
        "startDate" date NOT NULL,
        "endDate" date,
        "status" "recurring_flow_status_enum" NOT NULL DEFAULT 'draft',
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recurring_flows" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_recurring_flows_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "CHK_recurring_flows_interval_positive" CHECK ("interval" >= 1),
        CONSTRAINT "CHK_recurring_flows_end_after_start" CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "recurring_flow_taxonomies" (
        "recurringFlowId" uuid NOT NULL,
        "taxonomyId" uuid NOT NULL,
        CONSTRAINT "PK_recurring_flow_taxonomies" PRIMARY KEY ("recurringFlowId", "taxonomyId")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD CONSTRAINT "FK_recurring_flows_value_stream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD CONSTRAINT "FK_recurring_flows_agent"
      FOREIGN KEY ("counterpartyAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD CONSTRAINT "FK_recurring_flows_value"
      FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD CONSTRAINT "FK_recurring_flows_offering"
      FOREIGN KEY ("offeringId") REFERENCES "offerings"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD CONSTRAINT "FK_recurring_flows_agreement"
      FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flow_taxonomies"
      ADD CONSTRAINT "FK_recurring_flow_taxonomies_flow"
      FOREIGN KEY ("recurringFlowId") REFERENCES "recurring_flows"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flow_taxonomies"
      ADD CONSTRAINT "FK_recurring_flow_taxonomies_taxonomy"
      FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_flows_value_stream" ON "recurring_flows" ("valueStreamId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_flows_agent" ON "recurring_flows" ("counterpartyAgentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_flows_status" ON "recurring_flows" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_flows_start_date" ON "recurring_flows" ("startDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_flow_taxonomies_taxonomy" ON "recurring_flow_taxonomies" ("taxonomyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_flow_taxonomies_taxonomy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_flows_start_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_flows_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_flows_agent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_flows_value_stream"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_flow_taxonomies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_flows"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurring_flow_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurring_flow_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "recurring_flow_direction_enum"`);
  }
}
