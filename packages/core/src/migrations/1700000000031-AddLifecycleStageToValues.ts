import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLifecycleStageToValues1700000000031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "value_lifecycle_stage_enum" AS ENUM ('idea', 'alpha', 'beta', 'stable', 'legacy')`,
    );
    await queryRunner.query(
      `ALTER TABLE "values" ADD "lifecycleStage" "value_lifecycle_stage_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "values" DROP COLUMN "lifecycleStage"`);
    await queryRunner.query(`DROP TYPE "value_lifecycle_stage_enum"`);
  }
}
