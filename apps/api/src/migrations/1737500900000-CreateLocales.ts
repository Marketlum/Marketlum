import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLocales1737500900000 implements MigrationInterface {
    name = 'CreateLocales1737500900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "locale" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(16) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_locale_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_locale_code" UNIQUE ("code")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_locale_code" ON "locale" ("code")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_locale_code"`);
        await queryRunner.query(`DROP TABLE "locale"`);
    }
}
