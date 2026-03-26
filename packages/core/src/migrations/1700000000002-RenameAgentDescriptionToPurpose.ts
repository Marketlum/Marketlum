import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAgentDescriptionToPurpose1700000000002 implements MigrationInterface {
  name = 'RenameAgentDescriptionToPurpose1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agents" RENAME COLUMN "description" TO "purpose"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agents" RENAME COLUMN "purpose" TO "description"`);
  }
}
