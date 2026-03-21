import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeExchangePartyRoleOptional1700000000034 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exchange_parties" ALTER COLUMN "role" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "exchange_parties" SET "role" = '' WHERE "role" IS NULL`);
    await queryRunner.query(`ALTER TABLE "exchange_parties" ALTER COLUMN "role" SET NOT NULL`);
  }
}
