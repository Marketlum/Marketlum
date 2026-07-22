import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveInvoiceDirectionAndValueStream1700000000052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_vs_issued"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "direction"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoices_direction_enum"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_valueStream"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "valueStreamId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invoices_direction_enum" AS ENUM ('revenue', 'expense')
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices"
        ADD COLUMN "direction" "invoices_direction_enum" NOT NULL DEFAULT 'revenue'
    `);
    await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "direction" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN "valueStreamId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "invoices"
        ADD CONSTRAINT "FK_invoices_valueStream"
        FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invoices_vs_issued" ON "invoices" ("valueStreamId", "issuedAt")
    `);
  }
}
