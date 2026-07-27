import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnBehalfInvoicing1700000000059 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD COLUMN "onBehalfOfAgentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD COLUMN "mirrorInvoiceId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_onBehalfOfAgent"
        FOREIGN KEY ("onBehalfOfAgentId") REFERENCES "agents"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_mirrorInvoice"
        FOREIGN KEY ("mirrorInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "UQ_invoices_mirrorInvoice" UNIQUE ("mirrorInvoiceId")
    `);
    // Supports the mirror reverse join (source lookup) and the dashboard
    // NOT EXISTS exclusion.
    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_mirrorInvoice" ON "invoices" ("mirrorInvoiceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_invoices_mirrorInvoice"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "UQ_invoices_mirrorInvoice"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_mirrorInvoice"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_onBehalfOfAgent"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "mirrorInvoiceId"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "onBehalfOfAgentId"`);
  }
}
