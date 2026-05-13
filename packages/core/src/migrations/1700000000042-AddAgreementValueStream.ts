import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreementValueStream1700000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agreements" ADD COLUMN "valueStreamId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "agreements"
      ADD CONSTRAINT "FK_agreements_value_stream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agreements_value_stream" ON "agreements" ("valueStreamId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agreements_value_stream"`);
    await queryRunner.query(`
      ALTER TABLE "agreements" DROP CONSTRAINT IF EXISTS "FK_agreements_value_stream"
    `);
    await queryRunner.query(`
      ALTER TABLE "agreements" DROP COLUMN IF EXISTS "valueStreamId"
    `);
  }
}
