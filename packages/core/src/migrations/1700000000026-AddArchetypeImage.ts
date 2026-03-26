import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchetypeImage1700000000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "archetypes" ADD "imageId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "archetypes" ADD CONSTRAINT "FK_archetypes_image" FOREIGN KEY ("imageId") REFERENCES "files"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "archetypes" DROP CONSTRAINT "FK_archetypes_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "archetypes" DROP COLUMN "imageId"`,
    );
  }
}
