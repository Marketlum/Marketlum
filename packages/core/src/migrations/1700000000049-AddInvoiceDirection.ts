import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceDirection1700000000049 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invoices_direction_enum" AS ENUM ('revenue', 'expense')
    `);

    // Add nullable first so the backfill can populate existing rows.
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD COLUMN "direction" "invoices_direction_enum"
    `);

    // Backfill every existing invoice to REVENUE; expenses are re-classified
    // by hand afterwards (spec 011 Q2.3).
    await queryRunner.query(`
      UPDATE "invoices" SET "direction" = 'revenue' WHERE "direction" IS NULL
    `);

    // No DB default — the application always supplies direction (Zod required).
    await queryRunner.query(`
      ALTER TABLE "invoices" ALTER COLUMN "direction" SET NOT NULL
    `);

    // Supports the financials aggregation query (scope by value stream + year).
    await queryRunner.query(`
      CREATE INDEX "idx_invoices_vs_issued" ON "invoices" ("valueStreamId", "issuedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_vs_issued"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "direction"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoices_direction_enum"`);
  }
}
