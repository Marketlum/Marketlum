import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerspectives1700000000011 implements MigrationInterface {
  name = 'AddPerspectives1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "perspectives" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "table" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "config" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_perspectives" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "perspectives"
        ADD CONSTRAINT "FK_perspectives_user"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_perspectives_userId_table" ON "perspectives" ("userId", "table")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_perspectives_userId_table"`);
    await queryRunner.query(`ALTER TABLE "perspectives" DROP CONSTRAINT "FK_perspectives_user"`);
    await queryRunner.query(`DROP TABLE "perspectives"`);
  }
}
