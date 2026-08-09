import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActorContactFields1700000000063 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "actors" ADD "email" character varying`);
    await queryRunner.query(`ALTER TABLE "actors" ADD "website" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "actors" DROP COLUMN "website"`);
    await queryRunner.query(`ALTER TABLE "actors" DROP COLUMN "email"`);
  }
}
