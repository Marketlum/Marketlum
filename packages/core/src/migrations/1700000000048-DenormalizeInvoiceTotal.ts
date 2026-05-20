import { MigrationInterface, QueryRunner } from 'typeorm';

export class DenormalizeInvoiceTotal1700000000048 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD COLUMN "total" numeric(12,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "invoices" SET "total" = COALESCE((
        SELECT SUM(ii."total")
        FROM "invoice_items" ii
        WHERE ii."invoiceId" = "invoices"."id"
      ), 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "total"`);
  }
}
