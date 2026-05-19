import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFunctionalCurrency1700000000047 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "system_settings"
      SET "key" = 'presentation_currency_id', "updatedAt" = NOW()
      WHERE "key" = 'base_value_id'
    `);

    await queryRunner.query(`
      ALTER TABLE "agents"
      ADD COLUMN "functionalCurrencyId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "agents"
      ADD CONSTRAINT "FK_agents_functional_currency"
      FOREIGN KEY ("functionalCurrencyId") REFERENCES "values"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_agents_functional_currency" ON "agents" ("functionalCurrencyId")
    `);

    await queryRunner.query(`
      ALTER TABLE "value_streams"
      ADD COLUMN "agentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "value_streams"
      ADD CONSTRAINT "FK_value_streams_agent"
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_value_streams_agent" ON "value_streams" ("agentId")
    `);

    await queryRunner.query(`
      ALTER TABLE "invoice_items" RENAME COLUMN "baseAmount" TO "presentationAmount"
    `);
    await queryRunner.query(`
      ALTER TABLE "invoice_items" RENAME COLUMN "rateUsed" TO "presentationRate"
    `);
    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      ADD COLUMN "fromAgentAmount" numeric(12,2),
      ADD COLUMN "fromAgentRate"   numeric(20,10),
      ADD COLUMN "toAgentAmount"   numeric(12,2),
      ADD COLUMN "toAgentRate"     numeric(20,10)
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows" RENAME COLUMN "baseAmount" TO "presentationAmount"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows" RENAME COLUMN "rateUsed" TO "presentationRate"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD COLUMN "fromAgentAmount" numeric(12,2),
      ADD COLUMN "fromAgentRate"   numeric(20,10),
      ADD COLUMN "toAgentAmount"   numeric(12,2),
      ADD COLUMN "toAgentRate"     numeric(20,10)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      DROP COLUMN IF EXISTS "toAgentRate",
      DROP COLUMN IF EXISTS "toAgentAmount",
      DROP COLUMN IF EXISTS "fromAgentRate",
      DROP COLUMN IF EXISTS "fromAgentAmount"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows" RENAME COLUMN "presentationRate" TO "rateUsed"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows" RENAME COLUMN "presentationAmount" TO "baseAmount"
    `);

    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      DROP COLUMN IF EXISTS "toAgentRate",
      DROP COLUMN IF EXISTS "toAgentAmount",
      DROP COLUMN IF EXISTS "fromAgentRate",
      DROP COLUMN IF EXISTS "fromAgentAmount"
    `);
    await queryRunner.query(`
      ALTER TABLE "invoice_items" RENAME COLUMN "presentationRate" TO "rateUsed"
    `);
    await queryRunner.query(`
      ALTER TABLE "invoice_items" RENAME COLUMN "presentationAmount" TO "baseAmount"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_value_streams_agent"`);
    await queryRunner.query(`
      ALTER TABLE "value_streams" DROP CONSTRAINT IF EXISTS "FK_value_streams_agent"
    `);
    await queryRunner.query(`
      ALTER TABLE "value_streams" DROP COLUMN IF EXISTS "agentId"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agents_functional_currency"`);
    await queryRunner.query(`
      ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "FK_agents_functional_currency"
    `);
    await queryRunner.query(`
      ALTER TABLE "agents" DROP COLUMN IF EXISTS "functionalCurrencyId"
    `);

    await queryRunner.query(`
      UPDATE "system_settings"
      SET "key" = 'base_value_id', "updatedAt" = NOW()
      WHERE "key" = 'presentation_currency_id'
    `);
  }
}
