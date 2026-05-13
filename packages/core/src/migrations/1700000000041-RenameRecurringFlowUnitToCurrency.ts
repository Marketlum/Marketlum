import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRecurringFlowUnitToCurrency1700000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable currencyId FK to values. Existing rows are left with NULL
    // currencyId — admins must resave each flow to fill it in. The Zod schema
    // marks currencyId as required on create, so new writes always set it.
    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD COLUMN "currencyId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD CONSTRAINT "FK_recurring_flows_currency"
      FOREIGN KEY ("currencyId") REFERENCES "values"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_flows_currency" ON "recurring_flows" ("currencyId")
    `);

    // Snapshots (rateUsed / baseAmount) were computed against the OLD valueId
    // semantics. Clear them so they get recomputed against currencyId on next
    // save. The budget page treats NULL snapshots as "skipped" with a banner
    // until the admin resaves.
    await queryRunner.query(`
      UPDATE "recurring_flows" SET "rateUsed" = NULL, "baseAmount" = NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows" DROP COLUMN "unit"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD COLUMN "unit" character varying(32) NOT NULL DEFAULT 'USD'
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows" ALTER COLUMN "unit" DROP DEFAULT
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_flows_currency"`);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows" DROP CONSTRAINT IF EXISTS "FK_recurring_flows_currency"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_flows" DROP COLUMN IF EXISTS "currencyId"
    `);
  }
}
