import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceChannel1700000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN "channelId" uuid`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_channel" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_channelId" ON "invoices" ("channelId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_channelId"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_channel"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "channelId"`);
  }
}
