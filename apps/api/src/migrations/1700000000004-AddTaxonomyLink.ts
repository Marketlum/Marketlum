import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxonomyLink1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "taxonomies" ADD "link" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "taxonomies" DROP COLUMN "link"`);
  }
}
