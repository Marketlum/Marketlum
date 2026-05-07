import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTensionState1700000000036 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tensions_state_enum" AS ENUM ('alive', 'resolved', 'stale')
    `);
    await queryRunner.query(`
      ALTER TABLE "tensions"
        ADD COLUMN "state" "tensions_state_enum" NOT NULL DEFAULT 'alive'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tensions" DROP COLUMN IF EXISTS "state"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tensions_state_enum"`);
  }
}
