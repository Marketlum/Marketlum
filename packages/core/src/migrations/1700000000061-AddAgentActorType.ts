import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentActorType1700000000061 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres 12+ allows ADD VALUE inside a transaction as long as the new
    // value is not used in the same transaction.
    await queryRunner.query(`ALTER TYPE "actor_type_enum" ADD VALUE IF NOT EXISTS 'agent'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot drop a single enum value; recreate the type without it.
    // Actors of type 'agent' are folded into 'virtual' (the closest legacy type).
    await queryRunner.query(`UPDATE "actors" SET "type" = 'virtual' WHERE "type" = 'agent'`);
    await queryRunner.query(`ALTER TYPE "actor_type_enum" RENAME TO "actor_type_enum_old"`);
    await queryRunner.query(`
      CREATE TYPE "actor_type_enum" AS ENUM('individual', 'organization', 'buyer', 'seller', 'broker', 'virtual')
    `);
    await queryRunner.query(`
      ALTER TABLE "actors"
      ALTER COLUMN "type" TYPE "actor_type_enum" USING "type"::text::"actor_type_enum"
    `);
    await queryRunner.query(`DROP TYPE "actor_type_enum_old"`);
  }
}
