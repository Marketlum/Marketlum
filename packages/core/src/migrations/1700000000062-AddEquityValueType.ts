import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEquityValueType1700000000062 implements MigrationInterface {
  name = 'AddEquityValueType1700000000062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "value_type_enum" ADD VALUE IF NOT EXISTS 'equity'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "values" ALTER COLUMN "type" TYPE TEXT`);
    await queryRunner.query(`UPDATE "values" SET "type" = 'product' WHERE "type" = 'equity'`);
    await queryRunner.query(`DROP TYPE "value_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "value_type_enum" AS ENUM('product', 'service', 'relationship', 'right', 'currency')`,
    );
    await queryRunner.query(
      `ALTER TABLE "values" ALTER COLUMN "type" TYPE "value_type_enum" USING "type"::"value_type_enum"`,
    );
  }
}
