import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTransactionAccountsOptional1700000000032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "fromAccountId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "toAccountId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "CHK_transactions_different_accounts"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "CHK_transactions_different_accounts" CHECK ("fromAccountId" IS NULL OR "toAccountId" IS NULL OR "fromAccountId" <> "toAccountId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "CHK_transactions_at_least_one_account" CHECK ("fromAccountId" IS NOT NULL OR "toAccountId" IS NOT NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "transactions" WHERE "fromAccountId" IS NULL OR "toAccountId" IS NULL`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "CHK_transactions_at_least_one_account"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "CHK_transactions_different_accounts"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "CHK_transactions_different_accounts" CHECK ("fromAccountId" <> "toAccountId")`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "fromAccountId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "toAccountId" SET NOT NULL`);
  }
}
