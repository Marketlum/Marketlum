import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentImage1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agents" ADD "imageId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_agents_image" FOREIGN KEY ("imageId") REFERENCES "files"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_agents_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP COLUMN "imageId"`,
    );
  }
}
