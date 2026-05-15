import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyValueType1700000000045 implements MigrationInterface {
  name = 'AddCurrencyValueType1700000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "value_type_enum" ADD VALUE IF NOT EXISTS 'currency'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "values" ALTER COLUMN "type" TYPE TEXT`);
    await queryRunner.query(`UPDATE "values" SET "type" = 'product' WHERE "type" = 'currency'`);
    await queryRunner.query(`DROP TYPE "value_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "value_type_enum" AS ENUM('product', 'service', 'relationship', 'right')`,
    );
    await queryRunner.query(
      `ALTER TABLE "values" ALTER COLUMN "type" TYPE "value_type_enum" USING "type"::"value_type_enum"`,
    );
  }
}
