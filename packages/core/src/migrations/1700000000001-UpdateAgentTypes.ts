import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAgentTypes1700000000001 implements MigrationInterface {
  name = 'UpdateAgentTypes1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert column to varchar first so we can manipulate values freely
    await queryRunner.query(`ALTER TABLE "agents" ALTER COLUMN "type" TYPE VARCHAR`);
    await queryRunner.query(`DROP TYPE "agent_type_enum"`);

    // Migrate existing data
    await queryRunner.query(`UPDATE "agents" SET "type" = 'organization' WHERE "type" = 'buyer'`);
    await queryRunner.query(`UPDATE "agents" SET "type" = 'individual' WHERE "type" = 'seller'`);
    await queryRunner.query(`UPDATE "agents" SET "type" = 'virtual' WHERE "type" = 'broker'`);

    // Recreate enum with new values and cast column back
    await queryRunner.query(`CREATE TYPE "agent_type_enum" AS ENUM('organization', 'individual', 'virtual')`);
    await queryRunner.query(`ALTER TABLE "agents" ALTER COLUMN "type" TYPE "agent_type_enum" USING "type"::"agent_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agents" ALTER COLUMN "type" TYPE VARCHAR`);
    await queryRunner.query(`DROP TYPE "agent_type_enum"`);

    await queryRunner.query(`UPDATE "agents" SET "type" = 'buyer' WHERE "type" = 'organization'`);
    await queryRunner.query(`UPDATE "agents" SET "type" = 'seller' WHERE "type" = 'individual'`);
    await queryRunner.query(`UPDATE "agents" SET "type" = 'broker' WHERE "type" = 'virtual'`);

    await queryRunner.query(`CREATE TYPE "agent_type_enum" AS ENUM('buyer', 'seller', 'broker')`);
    await queryRunner.query(`ALTER TABLE "agents" ALTER COLUMN "type" TYPE "agent_type_enum" USING "type"::"agent_type_enum"`);
  }
}
