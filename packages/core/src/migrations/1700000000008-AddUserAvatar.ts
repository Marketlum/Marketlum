import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAvatar1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatarId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_avatar" FOREIGN KEY ("avatarId") REFERENCES "files"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_avatar"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "avatarId"`,
    );
  }
}
