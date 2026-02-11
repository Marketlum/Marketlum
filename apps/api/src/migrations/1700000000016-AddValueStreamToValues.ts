import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValueStreamToValues1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "values" ADD COLUMN "valueStreamId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "values"
      ADD CONSTRAINT "FK_values_value_stream"
      FOREIGN KEY ("valueStreamId") REFERENCES "value_streams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "values" DROP CONSTRAINT IF EXISTS "FK_values_value_stream"`);
    await queryRunner.query(`ALTER TABLE "values" DROP COLUMN IF EXISTS "valueStreamId"`);
  }
}
