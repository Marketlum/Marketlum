import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressLatLng1700000000044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "addresses"
      ADD COLUMN "latitude" numeric(10, 7),
      ADD COLUMN "longitude" numeric(10, 7)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN IF EXISTS "longitude"`);
    await queryRunner.query(`ALTER TABLE "addresses" DROP COLUMN IF EXISTS "latitude"`);
  }
}
