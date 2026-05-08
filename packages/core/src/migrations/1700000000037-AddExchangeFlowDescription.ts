import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchangeFlowDescription1700000000037 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exchange_flows" ADD COLUMN "description" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exchange_flows" DROP COLUMN IF EXISTS "description"`);
  }
}
