import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTypes1700000000064 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_type_enum" AS ENUM ('human', 'agent')`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "type" "user_type_enum" NOT NULL DEFAULT 'human'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD "actorId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_actor"
        FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_type" ON "users" ("type")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_type"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_actor"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "actorId"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "user_type_enum"`);
  }
}
