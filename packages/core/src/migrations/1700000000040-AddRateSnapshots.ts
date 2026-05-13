import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRateSnapshots1700000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      ADD COLUMN "rateUsed" numeric(20,10),
      ADD COLUMN "baseAmount" numeric(12,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      ADD COLUMN "rateUsed" numeric(20,10),
      ADD COLUMN "baseAmount" numeric(12,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recurring_flows"
      DROP COLUMN IF EXISTS "baseAmount",
      DROP COLUMN IF EXISTS "rateUsed"
    `);

    await queryRunner.query(`
      ALTER TABLE "invoice_items"
      DROP COLUMN IF EXISTS "baseAmount",
      DROP COLUMN IF EXISTS "rateUsed"
    `);
  }
}
