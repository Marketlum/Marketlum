import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceMarket1700000000054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invoices_market_enum" AS ENUM ('internal', 'external')
    `);
    // Existing invoices are with outside counterparties by default.
    await queryRunner.query(`
      ALTER TABLE "invoices"
        ADD COLUMN "market" "invoices_market_enum" NOT NULL DEFAULT 'external'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "market"`);
    await queryRunner.query(`DROP TYPE "invoices_market_enum"`);
  }
}
